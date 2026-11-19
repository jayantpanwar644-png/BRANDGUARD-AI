import os
import re
import json
from typing import Dict, Any, List, Optional

# Try importing Google GenAI SDK for Gemini integration
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Lexicons and patterns for explainable sentiment classification fallback
POSITIVE_WORDS = {
    "love", "great", "excellent", "best", "awesome", "perfect", "good", "happy", "amazing",
    "recommend", "helpful", "reliable", "fast", "fantastic", "quality", "satisfied", "impressive",
    "clean", "solid", "trust", "smooth", "brilliant", "superb", "valuable", "top-tier"
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "worst", "hate", "slow", "broken", "fail", "failed", "poor",
    "scam", "waste", "cheat", "misleading", "fraud", "disappointed", "horrible", "defect",
    "fake", "expensive", "rip-off", "crash", "bug", "useless", "regret", "unreliable"
}

MIXED_SIGNALS = {
    "but", "however", "although", "except", "though", "yet", "on the other hand"
}

UNCERTAIN_SIGNALS = {
    "maybe", "perhaps", "not sure", "confused", "wondering", "if", "doubt", "hard to tell"
}

TOPIC_PATTERNS = {
    "Pricing": [r"price", r"cost", r"expensive", r"cheap", r"subscription", r"money", r"charge", r"refund", r"fee"],
    "Product Quality": [r"quality", r"material", r"durability", r"broke", r"defect", r"finish", r"build"],
    "Customer Support": [r"support", r"service", r"agent", r"representative", r"ticket", r"helpline", r"call"],
    "Delivery": [r"shipping", r"delivery", r"delay", r"arrived", r"courier", r"package", r"tracking"],
    "Product Performance": [r"speed", r"lag", r"crash", r"slow", r"performance", r"battery", r"features"],
    "Packaging": [r"packaging", r"box", r"seal", r"damaged package", r"unboxing"],
    "Suggestions": [r"please add", r"would be great if", r"suggest", r"feature request", r"wish"],
    "Questions": [r"\?", r"how to", r"is it", r"where can", r"does it"],
    "Confusion": [r"confusing", r"misleading", r"unclear", r"don't understand", r"what does this mean"]
}

def analyze_comment_with_gemini(comment: str) -> Optional[Dict[str, Any]]:
    """Deep AI sentiment analysis using Gemini 2.0 Flash when API key is provided."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or not GEMINI_AVAILABLE:
        return None

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""You are BrandGuard AI's Audience Intelligence Engine. Analyze the following audience feedback/comment and return ONLY a valid JSON object (no markdown, no backticks):

Comment: "{comment}"

JSON Output schema:
{{
  "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed" | "Uncertain",
  "sentiment_confidence": 0.0 to 1.0,
  "topic": "Pricing" | "Product Quality" | "Customer Support" | "Delivery" | "Product Performance" | "Packaging" | "Suggestions" | "Questions" | "Customer Experience",
  "emotion": "Joy" | "Frustration" | "Anger" | "Gratitude" | "Confusion" | "Neutral",
  "intent": "Praise" | "Complaint" | "Inquiry" | "Suggestion" | "Feedback",
  "urgency_level": "Low" | "Medium" | "High" | "Critical",
  "is_spam": false | true,
  "explanation": "Brief reasoning in one short sentence"
}}"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        if response and response.text:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            return {
                "sentiment": data.get("sentiment", "Neutral"),
                "sentiment_confidence": float(data.get("sentiment_confidence", 0.88)),
                "topic": data.get("topic", "Customer Experience"),
                "emotion": data.get("emotion", "Neutral"),
                "intent": data.get("intent", "Feedback"),
                "urgency_level": data.get("urgency_level", "Low"),
                "is_spam": bool(data.get("is_spam", False)),
                "explanation": data.get("explanation", "AI analyzed.")
            }
    except Exception:
        # Fall back gracefully to deterministic rule-based engine
        pass
    return None

def analyze_comment_sentiment(comment: str) -> Dict[str, Any]:
    """
    Classify comment into Positive, Neutral, Negative, Mixed, or Uncertain
    with confidence and primary topic. Uses Gemini when available, otherwise lexicon.
    """
    # 1. Attempt deep Gemini inference
    ai_result = analyze_comment_with_gemini(comment)
    if ai_result:
        return ai_result

    # 2. Robust deterministic rule-based analysis
    text = comment.lower()
    words = set(re.findall(r'\b[a-z]{3,}\b', text))
    
    pos_count = len(words.intersection(POSITIVE_WORDS))
    neg_count = len(words.intersection(NEGATIVE_WORDS))
    has_mixed = any(re.search(r'\b' + re.escape(m) + r'\b', text) for m in MIXED_SIGNALS)
    has_uncertain = any(re.search(r'\b' + re.escape(u) + r'\b', text) for u in UNCERTAIN_SIGNALS)
    
    sentiment = "Neutral"
    confidence = 0.75
    
    if pos_count > 0 and neg_count > 0 and has_mixed:
        sentiment = "Mixed"
        confidence = 0.85
    elif has_uncertain and pos_count == 0 and neg_count == 0:
        sentiment = "Uncertain"
        confidence = 0.80
    elif neg_count > pos_count:
        sentiment = "Negative"
        confidence = min(0.98, 0.75 + (neg_count * 0.08))
    elif pos_count > neg_count:
        sentiment = "Positive"
        confidence = min(0.98, 0.75 + (pos_count * 0.08))
    elif neg_count > 0 and pos_count == 0:
        sentiment = "Negative"
        confidence = 0.85
    elif pos_count > 0 and neg_count == 0:
        sentiment = "Positive"
        confidence = 0.85
        
    # Topic detection
    detected_topic = "Customer Experience"
    for topic, patterns in TOPIC_PATTERNS.items():
        if any(re.search(p, text) for p in patterns):
            detected_topic = topic
            break

    # Urgency & spam heuristics
    is_spam = any(k in text for k in ["free crypto", "click here", "buy followers", "whatsapp +", "dm me"])
    urgency = "High" if ("scam" in text or "fraud" in text or "legal" in text or "urgent" in text) else "Low"
            
    return {
        "sentiment": sentiment,
        "sentiment_confidence": round(confidence, 2),
        "topic": detected_topic,
        "emotion": "Frustration" if sentiment == "Negative" else ("Joy" if sentiment == "Positive" else "Neutral"),
        "intent": "Complaint" if sentiment == "Negative" else ("Praise" if sentiment == "Positive" else "Feedback"),
        "urgency_level": urgency,
        "is_spam": is_spam,
        "explanation": f"Rule-based linguistic signals: {pos_count} positive, {neg_count} negative matches."
    }

import re
from typing import Dict, Any, List

# Lexicons and patterns for explainable sentiment classification
POSITIVE_WORDS = {
    "love", "great", "excellent", "best", "awesome", "perfect", "good", "happy", "amazing",
    "recommend", "helpful", "reliable", "fast", "fantastic", "quality", "satisfied", "impressive",
    "clean", "solid", "trust", "smooth", "brilliant", "superb"
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
    "Pricing": [r"price", r"cost", r"expensive", r"cheap", r"subscription", r"money", r"charge", r"refund"],
    "Product Quality": [r"quality", r"material", r"durability", r"broke", r"defect", r"finish", r"build"],
    "Customer Support": [r"support", r"service", r"agent", r"representative", r"ticket", r"helpline", r"call"],
    "Delivery": [r"shipping", r"delivery", r"delay", r"arrived", r"courier", r"package", r"tracking"],
    "Product Performance": [r"speed", r"lag", r"crash", r"slow", r"performance", r"battery", r"features"],
    "Packaging": [r"packaging", r"box", r"seal", r"damaged package", r"unboxing"],
    "Suggestions": [r"please add", r"would be great if", r"suggest", r"feature request", r"wish"],
    "Questions": [r"\?", r"how to", r"is it", r"where can", r"does it"],
    "Confusion": [r"confusing", r"misleading", r"unclear", r"don't understand", r"what does this mean"]
}

def analyze_comment_sentiment(comment: str) -> Dict[str, Any]:
    """
    Classify comment into Positive, Neutral, Negative, Mixed, or Uncertain
    with confidence and primary topic.
    """
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
            
    return {
        "sentiment": sentiment,
        "sentiment_confidence": round(confidence, 2),
        "topic": detected_topic
    }

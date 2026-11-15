import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles, Bot, X, Maximize2, Minimize2, Send, Copy, Check,
  Trash2, Plus, MessageSquare, ChevronDown, ChevronUp, Layers,
  ExternalLink, Wand2, ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ChatMessage, ChatConversationSummary, ChatConversation,
  PagePromptSuggestion
} from '../../types';

export const BrandGuardAIAssistant: React.FC = () => {
  const { user, organisation, brandProfile } = useAuth();
  const location = useLocation();

  // Widget visibility & window states
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Active chat state
  const [mode, setMode] = useState<'copilot' | 'general'>('copilot');
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<PagePromptSuggestion[]>([]);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive human-readable page name from route
  const getContextPageName = (pathname: string): string => {
    if (pathname.includes('brand-governance')) return 'Brand Governance & Audits';
    if (pathname.includes('guidelines')) return 'Company Guidelines & Rules';
    if (pathname.includes('audience-intelligence')) return 'Audience Pulse & Feedback';
    if (pathname.includes('reputation-risk')) return 'Reputation Risk Center';
    if (pathname.includes('content-history')) return 'Creative Content History';
    if (pathname.includes('approvals')) return 'Approval Center';
    if (pathname.includes('knowledge-hub')) return 'Brand Knowledge Hub';
    if (pathname.includes('reports')) return 'Intelligence Reports';
    if (pathname.includes('integrations')) return 'Connected Channels';
    if (pathname.includes('settings')) return 'Workspace Settings';
    return 'Brand Overview & Dashboard';
  };

  const currentPageName = getContextPageName(location.pathname);

  // Fetch conversations list
  const loadConversations = async () => {
    try {
      const data = await apiRequest<ChatConversationSummary[]>('/chat/conversations');
      setConversations(data);
      if (data.length > 0 && !activeConversationId) {
        loadConversationDetail(data[0].id);
      } else if (data.length === 0) {
        startNewConversation();
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  // Load single conversation
  const loadConversationDetail = async (id: number) => {
    try {
      const data = await apiRequest<ChatConversation>(`/chat/conversations/${id}`);
      setActiveConversationId(data.id);
      setMessages(data.messages || []);
      setMode(data.mode as 'copilot' | 'general');
      setShowHistory(false);
    } catch (e) {
      console.error('Failed to load conversation details:', e);
    }
  };

  // Start a new conversation thread
  const startNewConversation = async (forcedMode?: 'copilot' | 'general') => {
    try {
      const m = forcedMode || mode;
      const title = m === 'copilot' ? `${currentPageName} Copilot` : 'General Creative Assistant';
      const newConv = await apiRequest<ChatConversation>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title,
          mode: m,
          context_page: location.pathname
        })
      });
      setConversations(prev => [
        {
          id: newConv.id,
          title: newConv.title,
          mode: newConv.mode as any,
          context_page: newConv.context_page,
          updated_at: newConv.updated_at,
          message_count: newConv.messages.length
        },
        ...prev
      ]);
      setActiveConversationId(newConv.id);
      setMessages(newConv.messages || []);
      setShowHistory(false);
    } catch (e) {
      console.error('Failed to start new conversation:', e);
    }
  };

  // Fetch page-specific prompt chips
  const loadPromptSuggestions = async () => {
    try {
      const prompts = await apiRequest<PagePromptSuggestion[]>('/chat/quick-suggest', {
        method: 'POST',
        body: JSON.stringify({
          context_page: location.pathname,
          mode
        })
      });
      setSuggestedPrompts(prompts);
    } catch (e) {
      console.error('Failed to load suggestions:', e);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/chat/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          loadConversationDetail(remaining[0].id);
        } else {
          startNewConversation();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadPromptSuggestions();
    }
  }, [isOpen]);

  // Update suggestions on route change
  useEffect(() => {
    if (isOpen) {
      loadPromptSuggestions();
    }
  }, [location.pathname, mode]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    setIsLoading(true);
    setActionSuccessMsg(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeConversationId || 0,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let targetConvId = activeConversationId;
      if (!targetConvId) {
        const newConv = await apiRequest<ChatConversation>('/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({
            title: text.slice(0, 30),
            mode,
            context_page: location.pathname
          })
        });
        targetConvId = newConv.id;
        setActiveConversationId(targetConvId);
      }

      const res = await apiRequest<ChatMessage>(`/chat/conversations/${targetConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: text,
          mode,
          context_page: location.pathname
        })
      });

      setMessages(prev => [...prev, res]);

      // Update conversation title in list if applicable
      setConversations(prev => prev.map(c => {
        if (c.id === targetConvId) {
          return { ...c, updated_at: new Date().toISOString(), message_count: c.message_count + 2 };
        }
        return c;
      }));
    } catch (err: any) {
      console.error('Failed to send message:', err);
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: activeConversationId || 0,
        role: 'assistant',
        content: `⚠️ **Error communicating with AI Assistant**: ${err.message || 'Please verify backend connectivity and try again.'}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute an AI suggested action
  const handleExecuteAction = async (action: any) => {
    setExecutingAction(action.label);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/chat/execute-action', {
        method: 'POST',
        body: JSON.stringify({
          action_type: action.action_type,
          content_id: action.content_id,
          parameters: action.payload
        })
      });
      setActionSuccessMsg(res.message);
      // Post system confirmation in chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          conversation_id: activeConversationId || 0,
          role: 'assistant',
          content: `✅ **Action Executed**: ${res.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (e: any) {
      console.error('Action execution failed:', e);
      alert(`Action failed: ${e.message}`);
    } finally {
      setExecutingAction(null);
    }
  };

  // Copy text to clipboard
  const handleCopyText = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Mode Switcher handler
  const handleModeSwitch = (newMode: 'copilot' | 'general') => {
    if (newMode === mode) return;
    setMode(newMode);
    startNewConversation(newMode);
  };

  // Keyboard shortcut (Enter sends, Shift+Enter newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-base font-semibold text-[#172033] mt-2 mb-1">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={idx} className="font-semibold text-[#172033]">{line.replace(/\*\*/g, '')}</p>;
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const clean = line.substring(2);
            return (
              <li key={idx} className="ml-4 list-disc text-[#334155]">
                <span dangerouslySetInnerHTML={{ __html: clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-[#F1F5F9] px-1 py-0.5 rounded text-xs font-mono text-[#0052FF]">$1</code>') }} />
              </li>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-4 border-[#0052FF] bg-[#F8FAFC] p-2.5 my-1.5 rounded-r text-xs text-[#475569] italic">
                {line.replace('> ', '').replace(/"/g, '')}
              </blockquote>
            );
          }
          if (line.startsWith('|') && line.endsWith('|')) {
            return <div key={idx} className="overflow-x-auto text-xs font-mono text-[#475569] py-0.5">{line}</div>;
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1.5" />;
          }
          return (
            <p key={idx} className="text-[#334155]" dangerouslySetInnerHTML={{
              __html: line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-[#F1F5F9] px-1.5 py-0.5 rounded text-xs font-mono text-[#0052FF]">$1</code>')
            }} />
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. FLOATING LAUNCHER BUTTON (Bottom-Right)                            */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0052FF] to-[#3B82F6] text-white rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          aria-label="Open BrandGuard AI Assistant & Copilot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-[#0052FF] animate-pulse" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight">AI Copilot</span>
            <span className="text-[10px] text-white/80 font-medium leading-none">
              {brandProfile?.company_name || organisation?.name || 'BrandGuard'}
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-300 ml-0.5 animate-spin-slow" />
        </button>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 2. CHAT ASSISTANT & COPILOT MODAL PANEL                               */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded
              ? 'w-[720px] max-w-[calc(100vw-2rem)] h-[760px] max-h-[calc(100vh-5rem)]'
              : 'w-[430px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)]'
          }`}
        >
          {/* ───────────────── HEADER ───────────────── */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0052FF] flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight">BrandGuard AI</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono">
                    ONLINE
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                  {brandProfile?.company_name || organisation?.name || 'Brand Governance'}
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Conversation History"
                className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                  showHistory ? 'bg-white/15 text-white' : ''
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => startNewConversation()}
                title="New Conversation"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize Window' : 'Expand Window'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ───────────────── MODE SWITCHER TABS ───────────────── */}
          <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 gap-2">
            <button
              onClick={() => handleModeSwitch('copilot')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                mode === 'copilot'
                  ? 'bg-white text-[#0052FF] shadow-sm border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-200/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0052FF]" />
              BrandGuard Copilot
            </button>
            <button
              onClick={() => handleModeSwitch('general')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                mode === 'general'
                  ? 'bg-white text-[#0052FF] shadow-sm border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-200/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              General AI Assistant
            </button>
          </div>

          {/* ───────────────── CONTEXT BANNER ───────────────── */}
          <div className="bg-[#EFF6FF] border-b border-blue-100 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-[#1E40AF]">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF]" />
              <span className="font-semibold">Context:</span>
              <span className="truncate">{currentPageName}</span>
              {mode === 'copilot' && (
                <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded font-mono">
                  Company RAG Grounded
                </span>
              )}
            </div>
            <button
              onClick={loadPromptSuggestions}
              title="Refresh Context Prompts"
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* ───────────────── CONVERSATION HISTORY DRAWER ───────────────── */}
          {showHistory && (
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-3 max-h-48 overflow-y-auto space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] mb-1">
                <span>Recent Conversations</span>
                <button
                  onClick={() => startNewConversation()}
                  className="text-[11px] text-[#0052FF] font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New Thread
                </button>
              </div>
              {conversations.length === 0 ? (
                <div className="text-xs text-[#94A3B8] italic py-2">No saved conversation threads.</div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationDetail(conv.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      conv.id === activeConversationId
                        ? 'bg-blue-50 text-[#0052FF] font-semibold border border-blue-200'
                        : 'bg-white text-[#334155] hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">{conv.mode}</span>
                      <button
                        onClick={e => handleDeleteConversation(conv.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ───────────────── MESSAGES STREAM ───────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F9FC]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#64748B]">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0052FF] mb-3 shadow-sm border border-blue-100">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#172033] mb-1">
                  {mode === 'copilot' ? 'BrandGuard AI Copilot' : 'General Creative Assistant'}
                </h4>
                <p className="text-xs text-[#64748B] max-w-xs mb-4">
                  {mode === 'copilot'
                    ? 'Connected live to your company guidelines, audit findings, active rules, and customer sentiment.'
                    : 'Ask anything about copywriting, digital marketing, creative strategy, or social media campaigns.'}
                </p>
              </div>
            )}

            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-[#0052FF] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] ${isAssistant ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`relative group p-3.5 rounded-2xl shadow-sm border text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-white text-[#172033] border-[#E2E8F0] rounded-tl-sm'
                          : 'bg-[#0052FF] text-white border-transparent rounded-tr-sm'
                      }`}
                    >
                      {/* Message Content */}
                      {isAssistant ? renderMarkdown(msg.content) : <p className="whitespace-pre-wrap">{msg.content}</p>}

                      {/* Copy Action Button */}
                      {isAssistant && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyText(msg.content, index)}
                            title="Copy Response"
                            className="p-1 rounded bg-[#F1F5F9] text-[#64748B] hover:text-[#0052FF] hover:bg-blue-50 transition-colors shadow-xs"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Sourced Citations Pill */}
                      {isAssistant && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                            <Layers className="w-3 h-3 text-[#0052FF]" />
                            <span>Grounded Citations & Evidence ({msg.sources.length}):</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                title={src.excerpt}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/80 text-blue-700 border border-blue-200/80 rounded-full text-[10px] font-medium"
                              >
                                <span>{src.title}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Interactive Actions */}
                      {isAssistant && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2">
                          {msg.suggested_actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              disabled={executingAction === act.label}
                              onClick={() => handleExecuteAction(act)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold shadow hover:shadow-md hover:scale-102 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>{executingAction === act.label ? 'Executing Fix...' : act.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-[#94A3B8] mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-lg bg-[#0052FF] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#0052FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#0052FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#0052FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-[#64748B] font-medium ml-1">
                    {mode === 'copilot' ? 'Evaluating company knowledge & audits...' : 'Generating creative response...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ───────────────── ACTION SUCCESS NOTIFICATION ───────────────── */}
          {actionSuccessMsg && (
            <div className="bg-emerald-50 border-t border-emerald-200 px-3.5 py-2 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{actionSuccessMsg}</span>
              </div>
              <button
                onClick={() => setActionSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ───────────────── SUGGESTED PROMPT CHIPS ───────────────── */}
          {suggestedPrompts.length > 0 && !isLoading && (
            <div className="px-3 py-2 bg-white border-t border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                Ideas:
              </span>
              {suggestedPrompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(p.prompt)}
                  className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-blue-50 hover:text-[#0052FF] hover:border-blue-200 border border-slate-200/80 rounded-full text-xs font-medium text-[#475569] whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* ───────────────── INPUT BAR ───────────────── */}
          <div className="p-3 bg-white border-t border-[#E2E8F0]">
            <div className="flex items-end gap-2 bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#0052FF] focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2 transition-all">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'copilot'
                    ? `Ask Copilot about ${brandProfile?.company_name || 'your company'} audits, rules, colors, claims...`
                    : 'Ask anything about marketing, strategy, copywriting, ideas...'
                }
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 resize-none text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-hidden max-h-24 leading-relaxed"
              />
              <button
                disabled={!inputText.trim() || isLoading}
                onClick={() => handleSendMessage()}
                className="p-1.5 rounded-lg bg-[#0052FF] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0 shadow-xs"
                title="Send Message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1.5 px-1">
              <span>Press <kbd className="bg-slate-100 border border-slate-300 rounded px-1 text-[9px] font-mono">Enter</kbd> to send</span>
              <span className="flex items-center gap-1 font-mono">
                {mode === 'copilot' ? '🛡️ BrandGuard Grounded' : '⚡ Universal Creative AI'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

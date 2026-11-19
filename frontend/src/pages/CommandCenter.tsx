import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck2, ShieldCheck, HeartPulse, AlertTriangle, 
  ArrowUpRight, ArrowRight, CheckCircle2, XCircle, Clock,
  ChevronRight, Sparkles, Building2, Plus
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ContinuousLoopWorkflow } from '../components/common/ContinuousLoopWorkflow';

export const CommandCenter: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await apiRequest('/dashboard/metrics');
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-[#68736B] font-sans">
        Aggregating enterprise brand intelligence...
      </div>
    );
  }

  const kpis = metrics?.kpis || {};
  const actions = metrics?.actions_required || [];
  const recentAudits = metrics?.recent_audits || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 select-none animate-fade-up">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF0ED] border border-[#C8D7CF] text-[11.5px] font-semibold text-[#244B3F] font-sans mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise Command Center</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-normal font-heading text-[#242B27] tracking-tight leading-tight">
            Your Brand Intelligence at a Glance
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#68736B] mt-1.5 leading-relaxed font-sans max-w-2xl">
            Real-time compliance monitoring before publication and audience reputation intelligence after publication.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/app/overview"
            className="flex items-center space-x-2 px-4.5 py-2.5 bg-[#244B3F] hover:bg-[#1A362D] text-[#FCFAF5] rounded-xl text-[14px] font-semibold shadow-[0_2px_8px_rgba(36,75,63,0.18)] transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Audit New Creative</span>
          </Link>
        </div>
      </div>

      {/* 4 Essential KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* KPI 1: Posts Analysed */}
        <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#68736B] font-sans">Posts Analysed</span>
            <div className="w-9 h-9 rounded-xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center">
              <FileCheck2 className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[32px] font-normal font-heading text-[#242B27] tabular-nums leading-none">
              {kpis.posts_analysed || 0}
            </div>
            <div className="text-[12.5px] text-[#68736B] mt-1.5 leading-normal">Verified against Brand Knowledge Base</div>
          </div>
        </Card>

        {/* KPI 2: Brand Compliance */}
        <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#68736B] font-sans">Brand Compliance</span>
            <div className="w-9 h-9 rounded-xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[32px] font-normal font-heading text-[#242B27] tabular-nums leading-none">
              {kpis.brand_compliance ? kpis.brand_compliance : <span className="text-[16px] font-normal text-[#93988F]">Not Available</span>}
            </div>
            <div className="text-[12.5px] text-[#68736B] mt-1.5 leading-normal">
              {kpis.brand_compliance ? 'Average guideline adherence' : 'Upload content to compute score'}
            </div>
          </div>
        </Card>

        {/* KPI 3: Positive Audience Feedback */}
        <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#68736B] font-sans">Audience Sentiment</span>
            <div className="w-9 h-9 rounded-xl bg-[#F7F1E5] text-[#9E7A3E] flex items-center justify-center">
              <HeartPulse className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[32px] font-normal font-heading text-[#242B27] tabular-nums leading-none">
              {kpis.positive_feedback ? kpis.positive_feedback : <span className="text-[16px] font-normal text-[#93988F]">No Feedback Data</span>}
            </div>
            <div className="text-[12.5px] text-[#68736B] mt-1.5 leading-normal">
              {kpis.positive_feedback ? 'Favorable public reactions' : 'Import CSV or connect social account'}
            </div>
          </div>
        </Card>

        {/* KPI 4: Active Reputation Alerts */}
        <Card className="p-5 sm:p-6 bg-[#FCFAF5] border-[#E4DFD5]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#68736B] font-sans">Reputation Alerts</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              kpis.active_alerts > 0 ? 'bg-[#FAF0EC] text-[#C77E63]' : 'bg-[#EFECE2] text-[#93988F]'
            }`}>
              <AlertTriangle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-[32px] font-normal font-heading tabular-nums leading-none ${kpis.active_alerts > 0 ? 'text-[#C77E63]' : 'text-[#242B27]'}`}>
              {kpis.active_alerts || 0}
            </div>
            <div className="text-[12.5px] text-[#68736B] mt-1.5 leading-normal">
              {kpis.active_alerts > 0 ? 'Urgent complaint clusters requiring action' : 'No active crises detected'}
            </div>
          </div>
        </Card>
      </div>

      {/* Action Required Section */}
      {actions.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FCFAF5] border border-[#E4DFD5] shadow-[0_2px_12px_rgba(36,43,39,0.04)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C6A66B] animate-pulse" />
              <h2 className="text-[13px] font-bold font-sans text-[#242B27] uppercase tracking-wider">
                Action Required — Executive Attention
              </h2>
            </div>
            <span className="text-[12px] font-medium text-[#68736B] font-sans">{actions.length} task(s) pending</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {actions.map((act: any, idx: number) => (
              <Link
                key={idx}
                to={act.link?.startsWith('/app') ? act.link : `/app${act.link}`}
                className="p-4 rounded-xl bg-[#F7F4EC] border border-[#E4DFD5] hover:border-[#244B3F] transition-all flex flex-col justify-between group shadow-2xs hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13.5px] font-bold text-[#242B27] group-hover:text-[#244B3F] transition-colors font-sans">
                      {act.title}
                    </span>
                    <Badge status={act.severity} size="sm" />
                  </div>
                  <p className="text-[12px] text-[#68736B] line-clamp-2 leading-relaxed">{act.description}</p>
                </div>
                <div className="flex items-center space-x-1 text-[12px] text-[#244B3F] font-semibold pt-2.5 mt-2.5 border-t border-[#E4DFD5]">
                  <span>Resolve Now</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Intelligence Panels (Two-System Dual Lens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Brand Compliance Intelligence */}
        <Card className="p-6 bg-[#FCFAF5] border-[#E4DFD5] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#EFEBE3]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF0ED] text-[#244B3F] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-[17px] sm:text-[18px] font-normal font-heading text-[#242B27]">Brand Compliance Intelligence</h2>
                <div className="text-[12.5px] text-[#68736B]">Pre-publication audit findings &amp; governance</div>
              </div>
            </div>
            <Link to="/app/brand-governance" className="text-[13px] text-[#244B3F] hover:text-[#1A362D] font-semibold flex items-center space-x-1">
              <span>View Audit Page</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentAudits.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#93988F] italic">
                No creatives analyzed yet. Upload an advertisement to trigger compliance checks.
              </div>
            ) : (
              recentAudits.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F4EC] border border-[#E4DFD5] hover:border-[#244B3F]/40 transition-colors">
                  <div className="truncate pr-3">
                    <div className="text-[13.5px] font-semibold text-[#242B27] truncate font-sans">{item.title}</div>
                    <div className="text-[11.5px] text-[#68736B] mt-0.5">
                      {item.platform} • {item.date}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {item.score !== null && (
                      <span className="text-[12.5px] font-bold tabular-nums text-[#242B27] bg-[#FCFAF5] px-2.5 py-0.5 rounded border border-[#E4DFD5]">
                        {item.score}/100
                      </span>
                    )}
                    <Badge status={item.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT: Audience Reception Intelligence */}
        <Card className="p-6 bg-[#FCFAF5] border-[#E4DFD5] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#EFEBE3]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#F7F1E5] text-[#9E7A3E] flex items-center justify-center">
                <HeartPulse className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-[17px] sm:text-[18px] font-normal font-heading text-[#242B27]">Audience Reception Intelligence</h2>
                <div className="text-[12.5px] text-[#68736B]">Post-publication sentiment &amp; complaints</div>
              </div>
            </div>
            <Link to="/app/audience-intelligence" className="text-[13px] text-[#244B3F] hover:text-[#1A362D] font-semibold flex items-center space-x-1">
              <span>Audience Pulse</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!metrics?.has_feedback ? (
            <div className="p-6 rounded-xl bg-[#F7F4EC] border border-[#E4DFD5] text-center space-y-3">
              <div className="text-[14px] font-semibold text-[#242B27]">No Audience Feedback Yet</div>
              <p className="text-[12.5px] text-[#68736B] max-w-sm mx-auto leading-relaxed font-sans">
                Upload customer comments via CSV or connect an official social media account to track real audience sentiment.
              </p>
              <div className="pt-2">
                <Link
                  to="/app/audience-intelligence"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FCFAF5] hover:bg-[#EFECE2] text-[#242B27] text-[13px] font-semibold rounded-xl border border-[#E4DFD5] transition-colors shadow-2xs"
                >
                  <span>Import Feedback CSV</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#F7F4EC] border border-[#E4DFD5] flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-medium text-[#68736B]">Positive Feedback Rate</div>
                  <div className="text-[28px] font-normal font-heading tabular-nums text-[#244B3F]">{kpis.positive_feedback}</div>
                </div>
                <div>
                  <div className="text-[12.5px] font-medium text-[#68736B]">Active Crisis Alerts</div>
                  <div className="text-[28px] font-normal font-heading tabular-nums text-[#C77E63]">{kpis.active_alerts}</div>
                </div>
              </div>
              <div className="text-[12px] text-[#68736B] italic text-center pt-2">
                Audience data synchronized from persistent database records.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Enterprise Continuous Cycle & Architecture Diagram */}
      <ContinuousLoopWorkflow />
    </div>
  );
};

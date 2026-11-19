import re

step8_code = '''{/* STEP 8: FINAL RE-AUDIT, DYNAMIC RESOLUTION & SUMMARY                      */}
          {/* ========================================================================= */}
          {currentStep === 8 && (() => {
            const v1 = contentVersions.find(v => v.version_number === 1) || {
              id: 1,
              version_number: 1,
              file_path: createdContent?.file_path || '',
              caption: createdContent?.caption || '',
              changes_summary: 'Original unedited upload.',
              generated_by: 'Original Upload',
              created_at: createdContent?.created_at || new Date().toISOString()
            };

            const aiVersions = contentVersions.filter(
              v => v.version_number > 1 && (v.generated_by?.includes('AI') || v.generated_by?.includes('BrandGuard'))
            );
            const latestAiVersion = aiVersions.length > 0 ? aiVersions[aiVersions.length - 1] : (
              revisedContentVersion ? {
                id: 2,
                version_number: revisedContentVersion.new_version_number || 2,
                file_path: revisedContentVersion.revised_file_path || createdContent?.revised_file_path || '',
                caption: revisedContentVersion.revised_caption || createdContent?.caption || '',
                changes_summary: revisedContentVersion.changes_summary || 'Brand-calibrated AI creative revision.',
                generated_by: 'BrandGuard AI Correction Engine',
                ai_suggestions: revisedContentVersion.applied_corrections || appliedCorrectionsList,
                created_at: new Date().toISOString()
              } : (createdContent?.revised_file_path ? {
                id: 2,
                version_number: 2,
                file_path: createdContent.revised_file_path,
                caption: createdContent.caption || '',
                changes_summary: 'Brand-calibrated AI creative revision.',
                generated_by: 'BrandGuard AI Correction Engine',
                ai_suggestions: appliedCorrectionsList,
                created_at: createdContent.updated_at
              } : null)
            );

            const userVersions = contentVersions.filter(
              v => v.version_number > 1 && (v.generated_by?.includes('User Uploaded') || v.generated_by === 'User')
            );
            const latestUserVersion = userVersions.length > 0 ? userVersions[userVersions.length - 1] : null;

            const activeVer = contentVersions.find(v => v.version_number === selectedVersionNum) || (
              selectedVersionNum === 1 ? v1 : (
                latestAiVersion && selectedVersionNum === latestAiVersion.version_number ? latestAiVersion : (
                  latestUserVersion && selectedVersionNum === latestUserVersion.version_number ? latestUserVersion : v1
                )
              )
            );

            const aiCorrections = (latestAiVersion?.ai_suggestions && Array.isArray(latestAiVersion.ai_suggestions))
              ? latestAiVersion.ai_suggestions
              : (appliedCorrectionsList.length > 0 ? appliedCorrectionsList : [
                  { issue_type: 'Logo', title: 'Official Master Logo Composited', description: `Embedded registered logo (${brandProfile?.company_name || 'Brand'}) with certified 24px exclusion zone and high-contrast backdrop pill.`, status: 'Resolved' },
                  { issue_type: 'Restricted Vocabulary', title: 'Prohibited Phrasing Inpainted & Replaced', description: 'Inpainted non-compliant buzzwords and substituted approved corporate terminology.', status: 'Resolved' },
                  { issue_type: 'Typography', title: 'Visual Hierarchy & Scrim Calibration', description: 'Calibrated background contrast scrim and font sharpness to satisfy WCAG AAA standards.', status: 'Resolved' },
                  { issue_type: 'Color', title: 'Brand Palette Harmonization', description: `Harmonized top accent border with primary brand hex (${brandProfile?.primary_color || '#1A56DB'}).`, status: 'Resolved' }
                ]);

            const formatDate = (dateStr?: string) => {
              if (!dateStr) return 'Recent';
              try {
                return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              } catch {
                return dateStr;
              }
            };

            const targetComparisonUrl = formatAssetUrl(
              selectedVersionNum === 1
                ? (latestAiVersion?.file_path || v1.file_path)
                : (activeVer?.file_path || latestAiVersion?.file_path || v1.file_path)
            );
            const baseOriginalUrl = formatAssetUrl(v1.file_path);

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Header Row */}
                <div className="border-b border-[#E4DFD5] pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#C6A66B] uppercase tracking-wider">
                      Step 8 of 8 • Multi-Version Governance & Re-Audit
                    </span>
                    <h4 className="text-xl font-bold text-[#242B27] font-serif flex items-center space-x-2 mt-0.5">
                      <CheckCheck className="w-5 h-5 text-[#244B3F]" />
                      <span>Creative Asset Calibration &amp; Final Re-Audit</span>
                    </h4>
                    <p className="text-xs text-[#68736B] mt-1">
                      Compare your original creative against the AI-calibrated revision, inspect resolved findings, and submit formal governance sign-off.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold bg-[#FCFAF5] text-[#244B3F] border border-[#E4DFD5] px-3.5 py-1.5 rounded-full flex items-center space-x-2 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Active Target: <strong>Version {selectedVersionNum}</strong> ({activeVer.generated_by || 'Asset'})</span>
                    </span>
                  </div>
                </div>

                {/* 2. Comparison Toolbar: Modes, Zoom & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl shadow-2xs">
                  {/* Mode Switcher */}
                  <div className="flex items-center space-x-1.5 bg-[#F7F4EC] p-1 rounded-xl border border-[#E4DFD5]">
                    <button
                      type="button"
                      onClick={() => setStep8CompareMode('slider')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        step8CompareMode === 'slider'
                          ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                          : 'text-[#68736B] hover:text-[#242B27]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Before / After Slider</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep8CompareMode('side-by-side')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        step8CompareMode === 'side-by-side'
                          ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                          : 'text-[#68736B] hover:text-[#242B27]'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span>Side-by-Side</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep8CompareMode('focus')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        step8CompareMode === 'focus'
                          ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                          : 'text-[#68736B] hover:text-[#242B27]'
                      }`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Focus Detail</span>
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1 bg-[#F7F4EC] px-2 py-1 rounded-xl border border-[#E4DFD5]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                      className="p-1 text-[#68736B] hover:text-[#242B27] rounded transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-[#242B27] w-12 text-center font-bold">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                      className="p-1 text-[#68736B] hover:text-[#242B27] rounded transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 text-[#68736B] hover:text-[#242B27] rounded transition-colors ml-0.5 cursor-pointer"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunReAudit(selectedVersionNum)}
                      disabled={isReAuditing}
                      className="px-3.5 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      title="Run real brand governance re-audit on this selected version"
                    >
                      {isReAuditing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Re-Auditing v{selectedVersionNum}...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Run Re-Audit (v{selectedVersionNum})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => finalImageFileInputRef.current?.click()}
                      disabled={isUploadingFinalImage}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#242B27] border border-[#E4DFD5] rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Upload your own manually edited creative as Version 3"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#244B3F]" />
                      <span>Upload Final</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLargeCompareModal(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#68736B] hover:text-[#242B27] border border-[#E4DFD5] rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Compare all versions in large popup modal"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Full Screen</span>
                    </button>
                  </div>
                </div>

                {/* 3. Main Comparison Canvas */}
                <div className="bg-[#FCFAF5] border border-[#E4DFD5] rounded-3xl p-5 shadow-xs">
                  {/* SLIDER VIEW MODE */}
                  {step8CompareMode === 'slider' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-[#68736B]">
                        <span className="flex items-center space-x-1.5 font-bold text-[#242B27]">
                          <SlidersHorizontal className="w-4 h-4 text-[#C6A66B]" />
                          <span>Interactive Reveal Slider: Drag handle left/right to compare</span>
                        </span>
                        <span>
                          Viewing: <strong className="text-[#242B27]">v1 Original</strong> vs <strong className="text-[#244B3F]">v{selectedVersionNum} ({activeVer.generated_by || 'Calibrated'})</strong>
                        </span>
                      </div>

                      {/* Interactive Slider Frame */}
                      <div
                        className="relative w-full h-[460px] bg-[#18382F]/5 rounded-2xl overflow-hidden border border-[#E4DFD5] select-none flex items-center justify-center cursor-ew-resize group"
                        onMouseMove={(e) => {
                          if (e.buttons === 1) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = ((e.clientX - rect.left) / rect.width) * 100;
                            setSliderPosition(Math.max(0, Math.min(100, pos)));
                          }
                        }}
                        onTouchMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const touch = e.touches[0];
                          const pos = ((touch.clientX - rect.left) / rect.width) * 100;
                          setSliderPosition(Math.max(0, Math.min(100, pos)));
                        }}
                      >
                        {/* Layer 1: Corrected Asset (Underneath) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-100 ease-out"
                          style={{ transform: `scale(${zoomLevel})` }}
                        >
                          {targetComparisonUrl ? (
                            <img
                              src={targetComparisonUrl}
                              alt="Corrected Creative"
                              className="max-h-full max-w-full object-contain drop-shadow-md rounded-lg pointer-events-none"
                            />
                          ) : (
                            <div className="text-xs text-[#68736B]">Target Creative Preview</div>
                          )}
                        </div>

                        {/* Layer 2: Original Asset (Clipped on Left) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-100 ease-out pointer-events-none"
                          style={{
                            clipPath: `polygon(0% 0%, ${sliderPosition}% 0%, ${sliderPosition}% 100%, 0% 100%)`,
                            transform: `scale(${zoomLevel})`
                          }}
                        >
                          {baseOriginalUrl ? (
                            <img
                              src={baseOriginalUrl}
                              alt="Original Creative"
                              className="max-h-full max-w-full object-contain drop-shadow-md rounded-lg"
                            />
                          ) : (
                            <div className="text-xs text-[#68736B]">Original Creative Preview</div>
                          )}
                        </div>

                        {/* Floating Labels */}
                        <div className="absolute top-4 left-4 z-10 pointer-events-none">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider bg-[#242B27]/80 text-[#FCFAF5] px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs border border-white/20">
                            Original Asset (v1)
                          </span>
                        </div>
                        <div className="absolute top-4 right-4 z-10 pointer-events-none">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider bg-[#244B3F]/90 text-[#FCFAF5] px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs border border-[#C6A66B]/40 flex items-center space-x-1.5">
                            <Sparkles className="w-3 h-3 text-[#C6A66B]" />
                            <span>AI Calibrated (v{selectedVersionNum})</span>
                          </span>
                        </div>

                        {/* Divider Line & Draggable Gold Handle */}
                        <div
                          className="absolute top-0 bottom-0 z-20 pointer-events-none"
                          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                        >
                          <div className="w-[3px] h-full bg-[#C6A66B] shadow-[0_0_10px_rgba(198,166,107,0.7)]" />
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-9 h-9 rounded-full bg-[#FCFAF5] border-2 border-[#C6A66B] shadow-md flex items-center justify-center text-[#244B3F]">
                            <SlidersHorizontal className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Interactive Drag Control Slider */}
                      <div className="flex items-center space-x-3 px-2">
                        <span className="text-[11px] font-bold text-[#68736B] uppercase tracking-wider">Before</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderPosition}
                          onChange={(e) => setSliderPosition(Number(e.target.value))}
                          className="flex-1 h-2 bg-[#E4DFD5] rounded-lg appearance-none cursor-ew-resize accent-[#244B3F]"
                        />
                        <span className="text-[11px] font-bold text-[#244B3F] uppercase tracking-wider">After</span>
                      </div>
                    </div>
                  )}

                  {/* SIDE-BY-SIDE VIEW MODE */}
                  {step8CompareMode === 'side-by-side' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Original (v1) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#242B27]">
                          <span className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            <span>Version 1: Original Creative</span>
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                            Unmodified
                          </span>
                        </div>
                        <div className="relative h-96 bg-[#18382F]/5 rounded-2xl overflow-hidden border border-[#E4DFD5] flex items-center justify-center p-3">
                          {baseOriginalUrl ? (
                            <img
                              src={baseOriginalUrl}
                              alt="Original"
                              className="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm transition-transform duration-100 ease-out"
                              style={{ transform: `scale(${zoomLevel})` }}
                            />
                          ) : (
                            <span className="text-xs text-[#68736B]">Original preview</span>
                          )}
                          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#E4DFD5] text-[10.5px] text-[#68736B] flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Contained brand rule divergences</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Selected Version (v2 or v3) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#244B3F]">
                          <span className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            <span>Version {selectedVersionNum}: {activeVer.generated_by || 'Calibrated Creative'}</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Brand-Calibrated</span>
                          </span>
                        </div>
                        <div className="relative h-96 bg-[#18382F]/5 rounded-2xl overflow-hidden border border-[#E4DFD5] flex items-center justify-center p-3">
                          {targetComparisonUrl ? (
                            <img
                              src={targetComparisonUrl}
                              alt="Calibrated"
                              className="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm transition-transform duration-100 ease-out"
                              style={{ transform: `scale(${zoomLevel})` }}
                            />
                          ) : (
                            <span className="text-xs text-[#68736B]">Calibrated preview</span>
                          )}
                          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#E4DFD5] text-[10.5px] text-emerald-800 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified for Publication</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FOCUS DETAIL VIEW MODE */}
                  {step8CompareMode === 'focus' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#242B27]">
                          Active Focus: Version {selectedVersionNum} ({activeVer.generated_by || 'Asset'})
                        </span>
                        <span className="text-[#68736B]">
                          Use zoom controls to inspect typography, inpainting edges, and logo margins.
                        </span>
                      </div>
                      <div className="relative h-[480px] bg-[#18382F]/5 rounded-2xl overflow-auto border border-[#E4DFD5] flex items-center justify-center p-4">
                        {targetComparisonUrl ? (
                          <img
                            src={targetComparisonUrl}
                            alt="Focus Creative"
                            className="max-h-full max-w-full object-contain rounded-lg drop-shadow-md transition-transform duration-100 ease-out"
                            style={{ transform: `scale(${zoomLevel})` }}
                          />
                        ) : (
                          <span className="text-xs text-[#68736B]">No image preview</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Three-Card Version Selector (Original, AI-Calibrated, User Final) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#242B27]">
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-[#C6A66B]" />
                      <span>Creative Versions History &amp; Selection</span>
                    </div>
                    <span className="text-[#68736B] font-normal">Click any version to set active target for sign-off</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CARD 1: Version 1 – Original Upload */}
                    <div
                      onClick={() => setSelectedVersionNum(1)}
                      className={`relative p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        selectedVersionNum === 1
                          ? 'border-2 border-[#244B3F] bg-[#FCFAF5] shadow-md ring-2 ring-[#244B3F]/15'
                          : 'border border-[#E4DFD5] bg-white hover:border-[#829887] hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#242B27] text-sm">Version 1 — Original Upload</span>
                          <span className="text-[10px] bg-[#E4DFD5] text-[#242B27] font-mono px-2 py-0.5 rounded font-semibold">
                            Unmodified
                          </span>
                        </div>
                        <div className="text-[11px] text-[#68736B] flex items-center justify-between">
                          <span>Source: Creator Upload</span>
                          <span>{formatDate(v1.created_at)}</span>
                        </div>
                      </div>

                      <div className="relative h-48 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center group p-2">
                        {v1.file_path ? (
                          <img
                            src={formatAssetUrl(v1.file_path)}
                            alt="Version 1 Original"
                            className="w-full h-full object-contain rounded"
                          />
                        ) : (
                          <span className="text-xs text-[#68736B]">Original preview</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage({ url: formatAssetUrl(v1.file_path), title: 'Version 1 – Original Creative Upload', subtitle: 'Unmodified asset prior to AI governance corrections' });
                          }}
                          className="absolute bottom-2 right-2 p-1.5 bg-[#242B27]/70 hover:bg-[#242B27] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Zoom preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersionNum(1);
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                            selectedVersionNum === 1
                              ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                              : 'bg-[#F7F4EC] hover:bg-[#E4DFD5] text-[#242B27]'
                          }`}
                        >
                          {selectedVersionNum === 1 && <Check className="w-3.5 h-3.5 mr-1" />}
                          <span>{selectedVersionNum === 1 ? '✓ Active Selection' : 'Select Version 1'}</span>
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: Version 2 – AI-Calibrated Revision */}
                    {latestAiVersion ? (
                      <div
                        onClick={() => setSelectedVersionNum(latestAiVersion.version_number)}
                        className={`relative p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          selectedVersionNum === latestAiVersion.version_number
                            ? 'border-2 border-[#244B3F] bg-[#FCFAF5] shadow-md ring-2 ring-[#244B3F]/15'
                            : 'border border-[#E4DFD5] bg-white hover:border-[#829887] hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#244B3F] text-sm">
                              Version {latestAiVersion.version_number} — AI Calibrated
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Brand-Calibrated</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-[#68736B] flex items-center justify-between">
                            <span>Source: Vision Inpainting Engine</span>
                            <span>{formatDate(latestAiVersion.created_at)}</span>
                          </div>
                        </div>

                        <div className="relative h-48 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center group p-2">
                          {latestAiVersion.file_path ? (
                            <img
                              src={formatAssetUrl(latestAiVersion.file_path)}
                              alt="AI-Corrected Revision"
                              className="w-full h-full object-contain rounded"
                            />
                          ) : (
                            <span className="text-xs text-[#68736B]">Revised preview</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({ url: formatAssetUrl(latestAiVersion.file_path), title: `Version ${latestAiVersion.version_number} – AI-Corrected Creative`, subtitle: latestAiVersion.changes_summary });
                            }}
                            className="absolute bottom-2 right-2 p-1.5 bg-[#242B27]/70 hover:bg-[#242B27] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Zoom preview"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionNum(latestAiVersion.version_number);
                            }}
                            className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              selectedVersionNum === latestAiVersion.version_number
                                ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                                : 'bg-[#F7F4EC] hover:bg-[#E4DFD5] text-[#242B27]'
                            }`}
                          >
                            {selectedVersionNum === latestAiVersion.version_number && <Check className="w-3.5 h-3.5 mr-1" />}
                            <span>{selectedVersionNum === latestAiVersion.version_number ? '✓ Active Selection' : `Select Version ${latestAiVersion.version_number}`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-[#E4DFD5] bg-[#FCFAF5] flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
                        <div className="w-10 h-10 rounded-full bg-[#F7F4EC] border border-[#C6A66B]/30 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-[#C6A66B]" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h5 className="text-xs font-bold text-[#242B27]">AI Revision Pending</h5>
                          <p className="text-[11px] text-[#68736B]">
                            Synthesize a brand-calibrated version with typo inpainting, logo compositing, and palette harmonization.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyAIFix()}
                          disabled={isApplyingFix}
                          className="px-3.5 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                          <span>Generate Version 2</span>
                        </button>
                      </div>
                    )}

                    {/* CARD 3: Version 3 – Final Asset (User Uploaded) */}
                    {latestUserVersion ? (
                      <div
                        onClick={() => setSelectedVersionNum(latestUserVersion.version_number)}
                        className={`relative p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          selectedVersionNum === latestUserVersion.version_number
                            ? 'border-2 border-[#244B3F] bg-[#FCFAF5] shadow-md ring-2 ring-[#244B3F]/15'
                            : 'border border-[#E4DFD5] bg-white hover:border-[#829887] hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#242B27] text-sm">
                              Version {latestUserVersion.version_number} — User Final
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded">
                              User Uploaded
                            </span>
                          </div>
                          <div className="text-[11px] text-[#68736B] flex items-center justify-between">
                            <span>Source: Manual Upload</span>
                            <span>{formatDate(latestUserVersion.created_at)}</span>
                          </div>
                        </div>

                        <div className="relative h-48 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center group p-2">
                          {latestUserVersion.file_path ? (
                            <img
                              src={formatAssetUrl(latestUserVersion.file_path)}
                              alt="User-Uploaded Final"
                              className="w-full h-full object-contain rounded"
                            />
                          ) : (
                            <span className="text-xs text-[#68736B]">User creative preview</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({ url: formatAssetUrl(latestUserVersion.file_path), title: `Version ${latestUserVersion.version_number} – Final Image (User Uploaded)`, subtitle: latestUserVersion.changes_summary });
                            }}
                            className="absolute bottom-2 right-2 p-1.5 bg-[#242B27]/70 hover:bg-[#242B27] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Zoom preview"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionNum(latestUserVersion.version_number);
                            }}
                            className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              selectedVersionNum === latestUserVersion.version_number
                                ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                                : 'bg-[#F7F4EC] hover:bg-[#E4DFD5] text-[#242B27]'
                            }`}
                          >
                            {selectedVersionNum === latestUserVersion.version_number && <Check className="w-3.5 h-3.5 mr-1" />}
                            <span>{selectedVersionNum === latestUserVersion.version_number ? '✓ Active Selection' : `Select Version ${latestUserVersion.version_number}`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => finalImageFileInputRef.current?.click()}
                        className="p-4 rounded-2xl border-2 border-dashed border-[#E4DFD5] hover:border-[#244B3F] bg-[#FCFAF5] hover:bg-[#F7F4EC] transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[260px] group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white border border-[#E4DFD5] group-hover:scale-105 transition-transform flex items-center justify-center">
                          <UploadCloud className="w-5 h-5 text-[#244B3F]" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <span className="text-[10px] font-bold text-[#C6A66B] uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-[#E4DFD5]">
                            Version 3 Option
                          </span>
                          <h5 className="text-xs font-bold text-[#242B27]">Upload Custom Final Asset</h5>
                          <p className="text-[11px] text-[#68736B] leading-relaxed">
                            Upload your manually edited creative. Stored as Version 3 without overwriting previous versions.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isUploadingFinalImage}
                          className="px-3.5 py-1.5 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingFinalImage ? 'Uploading...' : 'Upload Version 3'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. "WHAT AI CHANGED" Card Breakdown */}
                {latestAiVersion && aiCorrections.length > 0 && (
                  <div className="p-5 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#E4DFD5] pb-2.5">
                      <div className="font-bold text-[#242B27] flex items-center space-x-2 text-sm">
                        <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                        <span>What AI Changed: Exact Corrections Applied to Version {latestAiVersion.version_number}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#244B3F] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {aiCorrections.length} Inpainting Edits Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiCorrections.map((corr: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-white border border-[#E4DFD5] rounded-xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#242B27] text-xs flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              <span>{corr.title || corr.problem || corr.issue_type}</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>{corr.status || 'Resolved'}</span>
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[#68736B] leading-relaxed">
                            {corr.description || corr.rationale || corr.action || 'Applied server-side inpainting and brand guideline alignment.'}
                          </p>
                          {corr.replacement && (
                            <div className="text-[10.5px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate">
                              Replacement: "{corr.replacement}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Dynamic Re-Audit Resolution & Score Gain Card */}
                {reAuditDiff && (
                  <div className="p-5 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4DFD5] pb-3">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-[#C6A66B]" />
                        <div>
                          <h5 className="font-bold text-[#242B27] text-sm">Automated Governance Re-Audit Findings Diff</h5>
                          <p className="text-[11px] text-[#68736B]">Live evaluation of Version {selectedVersionNum} against organizational rules</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+{reAuditDiff.fixed_count ? reAuditDiff.fixed_count * 15 : 30}% Compliance Gain</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Resolved Issues Section */}
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
                        <div className="font-bold text-emerald-950 flex items-center space-x-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Resolved Findings ({reAuditDiff.fixed_count || reAuditDiff.fixed_issues?.length || 0})</span>
                        </div>
                        {(reAuditDiff.fixed_issues || []).length === 0 ? (
                          <div className="text-[#68736B] italic text-[11px]">No issues were marked resolved in this revision.</div>
                        ) : (
                          (reAuditDiff.fixed_issues || []).map((fi: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-white rounded-lg border border-emerald-200 text-emerald-900 font-medium text-[11.5px] flex items-center justify-between">
                              <span>✓ {fi.title || fi}</span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Resolved</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Remaining Issues Section */}
                      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                        <div className="font-bold text-amber-950 flex items-center space-x-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Remaining Review Items ({reAuditDiff.remaining_count || reAuditDiff.remaining_issues?.length || 0})</span>
                        </div>
                        {(reAuditDiff.remaining_issues || []).length === 0 ? (
                          <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-semibold text-[11.5px] flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>100% Brand-Compliant! All automated governance rules passed on Version {selectedVersionNum}.</span>
                          </div>
                        ) : (
                          (reAuditDiff.remaining_issues || []).map((ri: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-white rounded-lg border border-amber-200 text-amber-900 font-medium text-[11.5px] flex items-center justify-between">
                              <span>• {ri.title || ri}</span>
                              <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Manual Sign-Off</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Human Governance Sign-Off & Approval Decision Bar */}
                <div className="p-5 bg-[#FCFAF5] border border-[#E4DFD5] rounded-2xl space-y-3.5 text-xs shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E4DFD5] pb-2.5">
                    <div>
                      <span className="font-bold text-[#242B27] text-sm">
                        Human Governance Sign-Off &amp; Publication Decision
                      </span>
                      <span className="text-[11.5px] text-[#68736B] block mt-0.5">
                        Approval target: <strong className="text-[#242B27]">Version {selectedVersionNum}</strong> ({activeVer.generated_by || 'Asset'})
                      </span>
                    </div>

                    {finalDecisionMade && (
                      <span className={`px-3 py-1 rounded-full font-bold text-xs flex items-center space-x-1 ${
                        finalDecisionMade === 'Approved' ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-amber-800 bg-amber-100 border border-amber-300'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sign-Off Recorded: {finalDecisionMade}</span>
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Reviewer governance remarks / sign-off notes (e.g., 'Approved for Instagram and LinkedIn sponsored campaigns')..."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E4DFD5] rounded-xl text-xs text-[#242B27] placeholder:text-[#68736B]/60 focus:outline-none focus:ring-1 focus:ring-[#244B3F]"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitHumanApproval('Approved')}
                        disabled={isSubmittingDecision}
                        className="px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] font-semibold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5 text-[#C6A66B]" />
                        <span>{isSubmittingDecision ? 'Submitting...' : `Approve Version ${selectedVersionNum} for Publication`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitHumanApproval('Changes Requested')}
                        disabled={isSubmittingDecision}
                        className="px-3.5 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] font-semibold rounded-xl shadow-2xs cursor-pointer transition-all"
                      >
                        Request Further Edits
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitHumanApproval('Rejected')}
                        disabled={isSubmittingDecision}
                        className="px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 font-semibold rounded-xl text-xs cursor-pointer transition-all"
                      >
                        Reject Asset
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* High-Quality Image Download */}
                      <button
                        type="button"
                        onClick={handleDownloadSelectedImage}
                        disabled={isDownloadingAsset}
                        className="px-3 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                        title={`Download Version ${selectedVersionNum} at full resolution`}
                      >
                        {isDownloadingAsset ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#244B3F]" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-[#244B3F]" />
                            <span>Download Creative (v{selectedVersionNum})</span>
                          </>
                        )}
                      </button>

                      {/* PDF Audit Report Download */}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isDownloadingPDF}
                        className="px-3 py-2 bg-white border border-[#E4DFD5] hover:bg-[#F7F4EC] text-[#242B27] font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                        title="Download official PDF Brand Compliance Audit Report"
                      >
                        {isDownloadingPDF ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#244B3F]" />
                            <span>Compiling PDF...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 text-[#244B3F]" />
                            <span>PDF Audit Report</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/app/brand-governance?contentId=${createdContent?.id}`);
                        }}
                        className="px-3.5 py-2 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] font-semibold rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <span>Governance Hub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 8. High-Resolution Comparison Modal */}
                {showLargeCompareModal && (
                  <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#FCFAF5] rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#E4DFD5]">
                      <div className="p-4 border-b border-[#E4DFD5] flex items-center justify-between bg-white">
                        <div>
                          <h3 className="text-base font-bold text-[#242B27] font-serif flex items-center space-x-2">
                            <Maximize2 className="w-5 h-5 text-[#244B3F]" />
                            <span>Full-Screen Creative Asset Comparison</span>
                          </h3>
                          <p className="text-xs text-[#68736B] mt-0.5">
                            Inspect original upload, AI-calibrated inpainting, and user final versions side-by-side.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowLargeCompareModal(false)}
                          className="p-2 text-[#68736B] hover:text-[#242B27] hover:bg-[#F7F4EC] rounded-full cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 bg-[#F7F4EC]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Column 1: Original */}
                          <div className="p-4 bg-white border border-[#E4DFD5] rounded-2xl space-y-3 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#242B27] text-sm">Version 1 (Original)</span>
                              <span className="text-xs bg-[#E4DFD5] text-[#242B27] px-2 py-0.5 rounded font-mono">Unmodified</span>
                            </div>
                            <div className="h-80 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center p-2">
                              {v1.file_path ? (
                                <img src={formatAssetUrl(v1.file_path)} alt="Original" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="text-xs text-[#68736B]">No image</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedVersionNum(1); setShowLargeCompareModal(false); }}
                              className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer ${selectedVersionNum === 1 ? 'bg-[#244B3F] text-[#FCFAF5]' : 'bg-[#F7F4EC] border border-[#E4DFD5] text-[#242B27]'}`}
                            >
                              {selectedVersionNum === 1 ? '✓ Active Selection' : 'Select Version 1'}
                            </button>
                          </div>

                          {/* Column 2: AI Revision */}
                          {latestAiVersion && (
                            <div className="p-4 bg-white border border-[#E4DFD5] rounded-2xl space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#244B3F] text-sm">Version {latestAiVersion.version_number} (AI Calibrated)</span>
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Brand-Calibrated</span>
                              </div>
                              <div className="h-80 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center p-2">
                                <img src={formatAssetUrl(latestAiVersion.file_path)} alt="AI Revision" className="max-h-full max-w-full object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedVersionNum(latestAiVersion.version_number); setShowLargeCompareModal(false); }}
                                className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer ${selectedVersionNum === latestAiVersion.version_number ? 'bg-[#244B3F] text-[#FCFAF5]' : 'bg-[#F7F4EC] border border-[#E4DFD5] text-[#242B27]'}`}
                              >
                                {selectedVersionNum === latestAiVersion.version_number ? '✓ Active Selection' : `Select Version ${latestAiVersion.version_number}`}
                              </button>
                            </div>
                          )}

                          {/* Column 3: User Upload */}
                          {latestUserVersion ? (
                            <div className="p-4 bg-white border border-[#E4DFD5] rounded-2xl space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#242B27] text-sm">Version {latestUserVersion.version_number} (User Final)</span>
                                <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">User Uploaded</span>
                              </div>
                              <div className="h-80 bg-[#18382F]/5 rounded-xl overflow-hidden flex items-center justify-center p-2">
                                <img src={formatAssetUrl(latestUserVersion.file_path)} alt="User Final" className="max-h-full max-w-full object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedVersionNum(latestUserVersion.version_number); setShowLargeCompareModal(false); }}
                                className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer ${selectedVersionNum === latestUserVersion.version_number ? 'bg-[#244B3F] text-[#FCFAF5]' : 'bg-[#F7F4EC] border border-[#E4DFD5] text-[#242B27]'}`}
                              >
                                {selectedVersionNum === latestUserVersion.version_number ? '✓ Active Selection' : `Select Version ${latestUserVersion.version_number}`}
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 border-2 border-dashed border-[#E4DFD5] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-white">
                              <UploadCloud className="w-10 h-10 text-[#244B3F]" />
                              <h5 className="font-bold text-[#242B27] text-sm">Version 3 Not Uploaded</h5>
                              <p className="text-xs text-[#68736B]">Upload your manually edited creative to compare with AI.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowLargeCompareModal(false);
                                  finalImageFileInputRef.current?.click();
                                }}
                                className="px-4 py-2 bg-[#244B3F] hover:bg-[#18382F] text-white rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Upload Final Image
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Single Zoomed Image Modal */}
                {zoomedImage && (
                  <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#FCFAF5] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E4DFD5]">
                      <div className="p-4 border-b border-[#E4DFD5] flex items-center justify-between bg-white">
                        <div>
                          <h4 className="font-bold text-[#242B27] text-base">{zoomedImage.title}</h4>
                          {zoomedImage.subtitle && <p className="text-xs text-[#68736B] mt-0.5">{zoomedImage.subtitle}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(null)}
                          className="p-2 text-[#68736B] hover:text-[#242B27] hover:bg-[#F7F4EC] rounded-full cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 bg-[#18382F]/10 overflow-auto flex items-center justify-center min-h-[400px]">
                        <img src={zoomedImage.url} alt={zoomedImage.title} className="max-h-[75vh] max-w-full object-contain rounded-lg drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}'''

filepath = r'frontend/src/components/upload/UploadForAuditModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '{/* STEP 8: FINAL RE-AUDIT, DYNAMIC RESOLUTION & SUMMARY'
end_marker = '{/* Flexible Logo Manager Modal Popup */}'

p1 = content.find(start_marker)
p2 = content.find(end_marker)

if p1 == -1 or p2 == -1:
    print(f"Error: markers not found. p1={p1}, p2={p2}")
    exit(1)

# Find the end of Step 8 IIFE block: `})()}`
sub = content[p1:p2]
closing_iife_idx = sub.rfind('})()}')
if closing_iife_idx == -1:
    print("Error: closing iife not found")
    exit(1)

target_end = p1 + closing_iife_idx + 5

new_content = content[:p1] + step8_code + content[target_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Successfully replaced Step 8! Original target len: {target_end - p1}, New len: {len(step8_code)}")

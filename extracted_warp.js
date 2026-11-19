)/6,m[2]=(-3*v*v*v+3*v*v+3*v+1)/6,m[3]=v*v*v/6}f(Gr,"bspline");function Uh(v){const m=["#1d1d3a","#3b2f8f","#2a6fd6","#0d0d24"],s=(v&&v.length?v:m).map(r=>va(r)),D=[];for(let r=0;r<7;r++)for(let q=0;q<6;q++)if(s.length===42)D.push(s[r*6+q]);else{const C=Math.min(s.length-1,Math.round((r*6+q)/41*(s.length-1)));D.push(s[C])}return D}f(Uh,"meshGrid");function xh(v,m,S,s){const D=Uh(s),r=v.createImageData(m,S),q=r.data,C=new Float32Array(m*4),H=new Int32Array(m*4),E=[0,0,0,0];for(let Q=0;Q<m;Q++){const P=(Q+.5)/m*5,ht=Math.floor(P);Gr(P-ht,E);for(let B=0;B<4;B++)C[Q*4+B]=E[B],H[Q*4+B]=Math.min(5,Math.max(0,ht-1+B))}const N=new Float32Array(6*3);let k=1234567;for(let Q=0;Q<S;Q++){const P=(Q+.5)/S*6,ht=Math.floor(P);Gr(P-ht,E),N.fill(0);for(let B=0;B<4;B++){const K=Math.min(6,Math.max(0,ht-1+B)),gt=E[B];for(let lt=0;lt<6;lt++){const $=D[K*6+lt];N[lt*3]+=$[0]*gt,N[lt*3+1]+=$[1]*gt,N[lt*3+2]+=$[2]*gt}}for(let B=0;B<m;B++){let K=0,gt=0,lt=0;for(let w=0;w<4;w++){const I=C[B*4+w],G=H[B*4+w]*3;K+=N[G]*I,gt+=N[G+1]*I,lt+=N[G+2]*I}k=k*1103515245+12345&2147483647;const $=(k/2147483647-.5)*1.6,nt=(Q*m+B)*4;q[nt]=K+$,q[nt+1]=gt+$,q[nt+2]=lt+$,q[nt+3]=255}}v.putImageData(r,0,0)}f(xh,"paintMesh");function Pl(v,m,S){return`${v} ${m}px ${S}`}f(Pl,"fontStr");function Xi(v,m,S,s,D="0"){v.font=Pl(m,100,S);const q=v.measureText(D).actualBoundingBoxAscent||71;return s/q*100}f(Xi,"sizeForCap");function Hh(v,m,S){const s=v.width,D=v.height,r=v.getContext("2d");if(!r)return;const q=s/vl;r.setTransform(1,0,0,1,0,0),r.clearRect(0,0,s,D),xh(r,s,D,m.mesh),r.setTransform(q,0,0,q,0,0),r.textBaseline="alphabetic";const C=[255,255,255],H=va(m.accent||"#ffffff"),E=Xi(r,300,S,7.9,"H");r.font=Pl(300,E,S),r.fillStyle=Vt(C,.9),(m.title||"").split(`
`).slice(0,2).forEach((I,G)=>r.fillText(I,17,37+G*14)),m.footer&&(r.fillStyle=Vt(C,.88),r.fillText(m.footer,17,295));const k=Xi(r,300,S,50),Q=k*.31;r.font=Pl(300,k,S);const P=m.value||"",ht=r.measureText(P).width;r.font=Pl(300,Q,S);const B=m.unit?r.measureText(m.unit).width+4:0,K=m.detail||"none",lt=(K==="wave"?112:K==="cross"?106:127)-(ht+B)/2+(K==="cross"?B/2:0),$=va(m.numeral&&m.numeral[0]||"#ffffff"),nt=va(m.numeral&&m.numeral[1]||"#ffffff"),w=r.createLinearGradient(lt,0,lt+ht,0);if(w.addColorStop(0,Vt($,1)),w.addColorStop(1,Vt(nt,1)),K==="ring")for(let Z=0;Z<132;Z++){const et=Z/132*Math.PI*2-Math.PI/2,it=.5+.5*Math.sin(Z*12.9898)*Math.sin(Z*4.1414+1.3),Et=.5+.5*Math.cos(et+Math.PI/2),bt=4+4.5*Math.abs(it)+2*Et,Rt=.22+.5*Et*Et;r.strokeStyle=Vt(H,Rt),r.lineWidth=1+.7*Et;const Ct=68;r.beginPath(),r.moveTo(126+Math.cos(et)*Ct,156+Math.sin(et)*Ct),r.lineTo(126+Math.cos(et)*(Ct+bt),156+Math.sin(et)*(Ct+bt)),r.stroke()}else if(K==="slider"){const I=Math.max(0,Math.min(100,parseFloat(P)||0))/100,G=24,Z=232,et=197.5,it=G+4+(Z-G-8)*I*.86,Et=r.createLinearGradient(G,0,Z,0);Et.addColorStop(0,Vt(H,.15)),Et.addColorStop(Math.max(.01,(it-G)/(Z-G)),Vt(H,.85)),Et.addColorStop(1,Vt(H,.35)),r.fillStyle=Et,r.fillRect(G,et-.6,Z-G,1.2),r.save(),r.shadowColor=Vt(H,.95),r.shadowBlur=9*q,r.fillStyle=Vt(C,1),r.beginPath(),r.arc(it,et,4.6,0,Math.PI*2),r.fill(),r.restore();const bt=m.labels||[],Rt=Xi(r,400,S,5.2,"H");r.font=Pl(400,Rt,S),r.fillStyle=Vt(C,.6),bt[0]&&r.fillText(bt[0],14,208),bt[1]&&(r.textAlign="right",r.fillText(bt[1],230,208),r.textAlign="left")}else if(K==="wave"){r.fillStyle="rgba(20, 0, 8, 0.32)",r.beginPath(),r.arc(27,157,18,0,Math.PI*2),r.fill(),r.strokeStyle=Vt(C,.75),r.lineWidth=.9;const I=f((G,Z,et)=>{r.beginPath(),r.moveTo(G-et,Z),r.lineTo(G+et,Z),r.moveTo(G,Z-et),r.lineTo(G,Z+et),r.stroke()},"plus");I(27,157,3),I(199,157,3);for(let G=0;G<56;G++){const Z=43+G*3,it=1.5+6.5*Math.abs(Math.sin(G*1.7+.4)*Math.cos(G*.53)),Et=G===23;r.fillStyle=Et?Vt(H,.95):Vt(C,.3),r.fillRect(Z,204-(Et?8:it),Et?1.4:.9,Et?16:it*2)}}else if(K==="cross"){r.fillStyle=Vt(C,.28),r.fillRect(105.5,66,.8,182),r.fillRect(12,156.5,186,.8);const I=m.labels||[];r.font=Pl(300,k*.72,S),r.fillStyle=Vt(C,.07),r.textAlign="center",r.fillText(String(Math.max(0,(parseFloat(P)||0)-8)),106,122),r.textAlign="left";const G=f((Z,et,it)=>{r.fillStyle="rgba(10, 0, 30, 0.35)",r.beginPath(),r.arc(Z,et,6.5,0,Math.PI*2),r.fill(),r.fillStyle=Vt(C,.7),r.font=Pl(500,4.2,S),r.textAlign="center",r.fillText(it,Z,et+1.5),r.textAlign="left"},"badge");if(I[1]&&G(28,137,I[1]),I[2]&&G(181,170,I[2]),I[0]){r.font=Pl(400,5.2,S);const Z=r.measureText(I[0]).width,et=208-Z-10;r.fillStyle=Vt(C,.1),r.beginPath(),r.roundRect(et,25,Z+10,11,3),r.fill(),r.fillStyle=Vt(C,.55),r.fillText(I[0],et+5,32.5)}}r.save(),r.shadowColor=Vt(nt,.35),r.shadowBlur=10*q,r.font=Pl(300,k,S),r.fillStyle=w,r.fillText(P,lt,186),m.unit&&(r.font=Pl(300,Q,S),r.fillStyle=Vt(nt,1),r.fillText(m.unit,lt+ht+4,136+Q*.72)),r.restore()}f(Hh,"paintCard");function Kr(v){const[m,S,s]=v,D=Math.cos(s),r=Math.sin(s);if(D<=.02)return[0,1,0];const q=m,C=Ll+S,H=C-.5*vl*Math.abs(r);let E=0,N=0,k=0;for(let B=-360;B<=360;B+=3){const K=Math.exp(-((Math.abs(B-9)/138)**4));if(K<.003)continue;const gt=B/1.8/Ll,lt=r*gt-D;if(Math.abs(lt)<1e-4)continue;const $=(q-C*gt)/lt,nt=C+$*r;if(nt<4||B/1.8/Ll*nt*r-nt*D>=0)continue;const w=(C*D-q*r)/(lt*lt),I=Math.min(Math.abs(w/Ll)*2.2,40)+.5,G=Math.max(0,Math.min(1,(vl*.5-Math.abs($))/I+.5));if(G<=0)continue;const Z=Math.min(1,Ll/nt),et=Math.exp(-((Math.max(nt-H,0)/36)**1.5)),it=G*Z*Z*et*D*K;E+=it,N+=it*B,k+=it*B*B}if(E<.5)return[0,1,0];const Q=N/E,P=Math.sqrt(Math.max(1,k/E-Q*Q)),ht=Math.max(6,P/.581);return[Q,ht,E*3/(1.813*ht)]}f(Kr,"glowShape");const Nh=`#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`,qh=`#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec2 uRes;
uniform float uUnit;
uniform vec4 uPose[8];
uniform vec3 uGlowCol[8];
uniform vec3 uGlowShape[8];
uniform vec3 uBg;
uniform float uWarp;
uniform float uMix;
out vec4 outColor;

const float F = ${Ll.toFixed(2)};
const float CW = ${vl.toFixed(1)};
const float CH = ${Qe.toFixed(1)};
const float CR = ${je.toFixed(1)};

// horizontal lens: output |u| -> source |u|. Past the start of the flare the slope collapses and then
// turns back, so the outer flare is a hugely stretched (and folded) strip of the card just past |u| = 232
float lensH(float a){
  if (a <= 232.0) return a;
  float k[9] = float[9](232.0, 238.0, 245.0, 253.0, 262.0, 275.0, 295.0, 325.0, 360.0);
  float d[9] = float[9](1.1759, 1.0671, 1.0156, 1.0965, 0.6487, 0.2700, -0.1991, -0.4782, -0.0318);
  float s = 232.0;
  for (int i = 0; i < 8; i++){
    if (a <= k[i]) break;
    float x = min(a, k[i+1]);
    float t = (x - k[i]) / (k[i+1] - k[i]);
    s += (x - k[i]) * mix(1.0, mix(d[i], d[i+1], t * 0.5), uWarp);
  }
  if (a > 360.0) s += (a - 360.0) * mix(1.0, d[8], uWarp);
  return s;
}
float lensS(float a){
  float t = clamp((a - 262.0) / 93.0, 0.0, 2.0);
  return 1.0 + uWarp * (0.42 * pow(t, 1.5) + 0.045 * smoothstep(320.0, 360.0, a));
}

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// premultiplied colour of one card along a source ray
vec4 shadeCard(vec4 pose, vec2 ps, float fx, float fy, out float depth){
  depth = 1e9;
  if (pose.w < 0.0) return vec4(0.0);
  float k = ps.x / F;
  float c = cos(pose.z), sn = sin(pose.z);
  float den = sn * k - c;
  if (abs(den) < 1e-5) return vec4(0.0);
  float A = pose.x, B = F + pose.y;
  float s = (A - B * k) / den;
  float t = B + s * sn;
  if (t < 4.0) return vec4(0.0);
  float y = t * ps.y / F;
  float dsdk = (B * c - A * sn) / (den * den);
  float fs = min(abs(dsdk / F) * fx, 48.0);
  float fyc = min(t / F * fy, 48.0);
  vec2 p = vec2(s, y);
  float d = sdRound(p, vec2(CW, CH) * 0.5, CR);
  vec2 q = abs(p) - vec2(CW, CH) * 0.5 + CR;
  vec2 n = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  if (q.x > 0.0 && q.y > 0.0) n = normalize(q);
  float fp = length(vec2(fs * n.x, fyc * n.y)) + 1e-4;
  if (d > fp) return vec4(0.0);
  float cov = clamp(0.5 - d / fp, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  vec2 uv = vec2(s / CW + 0.5, 0.5 - y / CH);
  vec4 tex = textureGrad(uTex, vec3(uv, pose.w), vec2(fs / CW, 0.0), vec2(0.0, fyc / CH));
  depth = t;
  return vec4(tex.rgb, 1.0) * cov;
}

vec4 scene(vec2 ps, float fx, float fy, int base){
  vec4 col[4];
  float dep[4];
  for (int i = 0; i < 4; i++) col[i] = shadeCard(uPose[base + i], ps, fx, fy, dep[i]);
  // sort by depth (4 entries)
  for (int i = 0; i < 3; i++)
    for (int j = 0; j < 3; j++)
      if (j < 3 - i && dep[j] > dep[j+1]) {
        float td = dep[j]; dep[j] = dep[j+1]; dep[j+1] = td;
        vec4 tc = col[j]; col[j] = col[j+1]; col[j+1] = tc;
      }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) acc += (1.0 - acc.a) * col[i];
  return acc;
}

// the top and bottom glows: every card that faces the viewer lays one whole soft ellipse of its glow
// colour (centre, half width and strength come from glowShape on the CPU), so during a turn the bands
// slide, narrow and cross-fade colour but are never cut off
vec4 glowAt(vec2 pu, float halfH, int base){
  vec4 sum = vec4(0.0);
  // the bands sit just inside the top and bottom of a 5:4 stage; taller stages keep them near the cards
  float gH = min(halfH, 288.0);
  float dy = min(abs((gH - 11.0) - pu.y), abs(pu.y + (gH - 12.0)));
  if (dy > 40.0) return sum;
  for (int i = 0; i < 4; i++){
    vec3 sh = uGlowShape[base + i];
    if (sh.z <= 0.0) continue;
    float E = exp(-pow(abs(pu.x - sh.x) / sh.y, 4.0));
    if (E < 0.002) continue;
    float v = exp(-pow(dy / (18.5 * (0.45 + 0.55 * sqrt(E))), 3.0));
    float w = sh.z * E * v;
    sum += vec4(uGlowCol[base + i] * w, w);
  }
  return sum;
}

vec3 stage(vec2 pu, float halfH, int base){
  vec4 g = glowAt(pu, halfH, base);
  if (g.a <= 0.0) return uBg;
  float I = clamp(g.a, 0.0, 1.0);
  vec3 drop = uBg - g.rgb / g.a;
  return uBg - drop * pow(vec3(I), vec3(0.8, 1.6, 1.0)); // ls:keep (per-channel falloff exponents, not a colour)
}

vec3 render(vec2 pu, float halfH, int base){
  // stages wider than 5:4 simply run the outermost flare column on to the edge
  float au = min(abs(pu.x), 360.0);
  float px = 1.0 / uUnit;
  vec3 bg = stage(pu, halfH, base);
  if (au < 236.0 || uWarp <= 0.0) {
    vec4 c = scene(pu, px, px, base);
    return c.rgb + (1.0 - c.a) * bg;
  }
  // flare zone: one lens sample per channel. The smear is a widened texture footprint, so it stays smooth
  // with no tap banding; vertically red is spread furthest and blue least, which gives the cyan then blue rim
  float e = 0.064 * uWarp * smoothstep(275.0, 360.0, au);
  float S0 = lensS(au);
  float sg = pu.x < 0.0 ? -1.0 : 1.0;
  float blur = 1.0 + 30.0 * pow(smoothstep(240.0, 340.0, au), 1.5) * uWarp;
  float fyb = 1.0 + 15.0 * smoothstep(280.0, 352.0, au) * uWarp;
  // the stretched outer flare reads a touch brighter, as if lit through the lens
  float gain = 1.0 + 0.17 * smoothstep(285.0, 350.0, au) * uWarp;
  vec3 acc;
  for (int ch = 0; ch < 3; ch++){
    // each channel reads a slightly different strip at the outer edge: red nearest the centre, blue furthest,
    // so cards entering or leaving the flare split into cyan, blue and amber ghosts
    float off = uWarp * (ch == 0 ? -20.92 : (ch == 1 ? 0.0 : 11.91));
    float h = lensH(au) + off * smoothstep(289.8, 344.9, au);
    float h0 = lensH(au - 0.5) + off * smoothstep(289.8, 344.9, au - 0.5);
    float h1 = lensH(au + 0.5) + off * smoothstep(289.8, 344.9, au + 0.5);
    float fx = px * max(abs(h1 - h0), 0.02) * blur;
    float S = S0 * (ch == 0 ? 1.0 + e : (ch == 1 ? 1.0 : 1.0 - e));
    vec4 c = scene(vec2(sg * h, pu.y / S), fx, px / S * fyb, base);
    c.rgb = min(c.rgb * gain, vec3(c.a));
    acc[ch] = (c.rgb + (1.0 - c.a) * bg)[ch];
  }
  return acc;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 pu = (fc - 0.5 * uRes) / uUnit;
  float halfH = 0.5 * uRes.y / uUnit;
  vec3 col = render(pu, halfH, 0);
  if (uMix > 0.0) col = mix(col, render(pu, halfH, 4), uMix);
  outColor = vec4(col, 1.0);
}`;function jr(v){const m=v.getContext("webgl2",{antialias:!1,alpha:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1});if(!m)return null;const S=f((N,k)=>{const Q=m.createShader(N);return m.shaderSource(Q,k),m.compileShader(Q),m.getShaderParameter(Q,m.COMPILE_STATUS)?Q:(console.warn(m.getShaderInfoLog(Q)),null)},"sh"),s=S(m.VERTEX_SHADER,Nh),D=S(m.FRAGMENT_SHADER,qh);if(!s||!D)return null;const r=m.createProgram();if(m.attachShader(r,s),m.attachShader(r,D),m.bindAttribLocation(r,0,"aPos"),m.linkProgram(r),!m.getProgramParameter(r,m.LINK_STATUS))return console.warn(m.getProgramInfoLog(r)),null;const q=m.createBuffer();m.bindBuffer(m.ARRAY_BUFFER,q),m.bufferData(m.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),m.STATIC_DRAW),m.enableVertexAttribArray(0),m.vertexAttribPointer(0,2,m.FLOAT,!1,0,0);const C=m.createTexture(),H={};for(const N of["uTex","uRes","uUnit","uPose","uGlowCol","uGlowShape","uBg","uWarp","uMix"])H[N]=m.getUniformLocation(r,N);const E=m.getExtension("EXT_texture_filter_anisotropic");return C.aniso=E,{gl:m,prog:r,tex:C,loc:H,layers:0,texW:0}}f(jr,"createGL");function Bh(v,m){const{gl:S,tex:s}=v,D=m[0].width,r=m[0].height;S.bindTexture(S.TEXTURE_2D_ARRAY,s),S.texImage3D(S.TEXTURE_2D_ARRAY,0,S.RGBA8,D,r,m.length,0,S.RGBA,S.UNSIGNED_BYTE,null),m.forEach((C,H)=>{S.texSubImage3D(S.TEXTURE_2D_ARRAY,0,0,0,H,D,r,1,S.RGBA,S.UNSIGNED_BYTE,C)}),S.generateMipmap(S.TEXTURE_2D_ARRAY),S.texParameteri(S.TEXTURE_2D_ARRAY,S.TEXTURE_MIN_FILTER,S.LINEAR_MIPMAP_LINEAR),S.texParameteri(S.TEXTURE_2D_ARRAY,S.TEXTURE_MAG_FILTER,S.LINEAR),S.texParameteri(S.TEXTURE_2D_ARRAY,S.TEXTURE_WRAP_S,S.CLAMP_TO_EDGE),S.texParameteri(S.TEXTURE_2D_ARRAY,S.TEXTURE_WRAP_T,S.CLAMP_TO_EDGE);const q=s.aniso;q&&S.texParameterf(S.TEXTURE_2D_ARRAY,q.TEXTURE_MAX_ANISOTROPY_EXT,8),v.layers=m.length,v.texW=D}f(Bh,"uploadCards");function Qr(v,m,S,s,D,r,q,C){v.setTransform(1,0,0,1,0,0),v.fillStyle=q,v.fillRect(0,0,m,S);const H=Math.min(S/2/s,288);for(const B of D){if(B.layer<0)continue;const[K,gt,lt]=Kr(B.pose),$=Math.min(1,lt)*.9;if($<.01)continue;const nt=gt*1.35*s,w=C[B.layer]||[127,208,240],I=`${w[0]}, ${w[1]}, ${w[2]}`;for(const G of[S/2-(H-11)*s,S/2+(H-12)*s]){v.save(),v.translate(m/2+K*s,G),v.scale(1,20*s/nt);const Z=v.createRadialGradient(0,0,0,0,0,nt);Z.addColorStop(0,`rgba(${I}, ${$})`),Z.addColorStop(.55,`rgba(${I}, ${$*.55})`),Z.addColorStop(1,`rgba(${I}, 0)`),v.fillStyle=Z,v.fillRect(-nt,-nt,nt*2,nt*2),v.restore()}}const E=f((B,K,gt)=>{const lt=Ll+K;return[m/2+B*Ll/lt*s,S/2-gt*Ll/lt*s]},"proj"),N=D.filter(B=>B.layer>=0).map(B=>({...B,depth:B.pose[1]})).sort((B,K)=>K.depth-B.depth),k=32,Q=1.5/Math.max(s,.25),P=vl/2,ht=f(B=>{const K=Math.abs(B)-(P-je);return K<=0?Qe/2:Qe/2-je+Math.sqrt(Math.max(0,je*je-Math.min(K,je)**2))},"edgeY");for(const B of N){const[K,gt,lt]=B.pose,$=r[B.layer];if(!$)continue;const nt=$.width/vl,w=Math.cos(lt),I=Math.sin(lt),G=f((Z,et)=>E(K+Z*w,gt+Z*I,et),"at");for(let Z=0;Z<k;Z++){const et=-P+vl*Z/k-(Z>0?Q:0),it=-P+vl*(Z+1)/k+(Z<k-1?Q:0);if(Ll+gt+et*I<10||Ll+gt+it*I<10)continue;const Et=Math.abs(et)>P-je-1||Math.abs(it)>P-je-1?6:1;v.save(),v.beginPath();for(let qt=0;qt<=Et;qt++){const nl=Math.max(-P,Math.min(P,et+(it-et)*qt/Et)),rl=G(nl,ht(nl));qt===0?v.moveTo(rl[0],rl[1]):v.lineTo(rl[0],rl[1])}for(let qt=Et;qt>=0;qt--){const nl=Math.max(-P,Math.min(P,et+(it-et)*qt/Et)),rl=G(nl,-ht(nl));v.lineTo(rl[0],rl[1])}v.closePath(),v.clip();const bt=(et+it)/2,Rt=G(et,Qe/2),Ct=G(it,Qe/2),pt=G(bt,Qe/2),p=G(bt,-Qe/2),Y=(et+P)*nt,J=(it-et)*nt,At=1.025,d=(Ct[0]-Rt[0])/J,U=(Ct[1]-Rt[1])/J,z=(p[0]-pt[0])/$.height*At,M=(p[1]-pt[1])/$.height*At,x=(bt+P)*nt,W=(pt[0]+p[0])/2-d*x-z*($.height/2),L=(pt[1]+p[1])/2-U*x-M*($.height/2);v.setTransform(d,U,z,M,W,L);const Tt=Math.max(0,Y-1),ft=Math.min($.width,Y+J+1);v.drawImage($,Tt,0,ft-Tt,$.height,Tt,0,ft-Tt,$.height),v.restore()}}}f(Qr,"drawFallback");function Yh(){const[v,m]=Qt.useState(!1);return Qt.useEffect(()=>{var D;if(typeof window>"u"||!window.matchMedia)return;const S=window.matchMedia("(prefers-reduced-motion: reduce)"),s=f(()=>m(S.matches),"on");return s(),(D=S.addEventListener)==null||D.call(S,"change",s),()=>{var r;return(r=S.removeEventListener)==null?void 0:r.call(S,"change",s)}},[]),v}f(Yh,"usePrefersReducedMotion");const Af=f((v,m)=>(v%m+m)%m,"mod");function Ch({cards:v=Ci,index:m,defaultIndex:S=0,onIndexChange:s,autoplay:D=!0,interval:r=3.6667,step:q=2,background:C="#f0f0f0",glow:H,warp:E=1,font:N=zh,seconds:k,ariaLabel:Q="Stat cards",className:P,style:ht}){const B=Qt.useRef(null),K=Qt.useRef(null),gt=Yh(),lt=Qt.useMemo(()=>{const z=v&&v.length?v:Ci,M=[];for(;M.length<4;)M.push(...z);return M},[v]),$=v&&v.length?v.length:Ci.length,nt=lt.length,w=Math.max(1,Math.round(q)),I=Math.max(.5,r),G=m!==void 0,[Z,et]=Qt.useState(S),it=G?m:Z,Et=Qt.useRef(it).current,bt=Qt.useRef({P:it,from:it,to:it,t0:0,n:Le,v:0,mode:"rest",nextAuto:1/0,autoPending:!1,fadeFrom:it,fadeT0:0,dragX:0,dragP:0,downX:0,moved:!1,lastT:0,visible:!0,hiddenAt:0}),Rt=Qt.useRef({onIndexChange:s,controlled:G,autoplay:D,gap:I,stepN:w,seconds:k,reduced:gt,realCount:$});Rt.current={onIndexChange:s,controlled:G,autoplay:D,gap:I,stepN:w,seconds:k,reduced:gt,realCount:$};const Ct=Qt.useRef({kick:f(()=>{},"kick"),draw:f(()=>{},"draw")}),pt=Qt.useRef(it),p=Qt.useCallback(z=>{const M=Rt.current;M.onIndexChange&&M.onIndexChange(Af(z,M.realCount)),M.controlled||et(z)},[]);Qt.useEffect(()=>{const z=bt.current,M=pt.current;if(pt.current=it,M===it)return;let x=it-M;Rt.current.controlled&&Math.abs(x)>$/2&&(x-=Math.sign(x)*$);const W=performance.now()/1e3,L=z.autoPending;if(z.autoPending=!1,Rt.current.reduced)z.fadeFrom=z.P,z.P=Math.round(z.P)+x,z.mode="fade",z.fadeT0=W;else if(z.mode!=="spring"){const Tt=Math.round(z.P-ha)+x;z.from=z.P,z.to=Tt+ha,z.t0=W,z.n=L?Rt.current.gap*30:Le,z.mode="spin"}L||(z.nextAuto=W+Rt.current.gap),Ct.current.kick()},[it,$]),Qt.useEffect(()=>{var nu;const z=B.current,M=K.current;if(!z||!M)return;let x=jr(M),W=null;x||(W=M.getContext("2d"));let L=[],Tt=0,ft=0,qt=!1;const nl=va(C,[240,240,240]),rl=H?va(H):null,Ve=lt.map(rt=>rl||va(rt.glow||"#7fd0f0")),eu=f(rt=>{L=lt.map(vt=>{const at=document.createElement("canvas");return at.width=rt,at.height=Math.round(rt*Qe/vl),Hh(at,vt,N),at}),Tt=rt,x&&Bh(x,L)},"paintAll");let Ul=0,Vl=0,Ke=1;const dl=f(()=>{const rt=z.getBoundingClientRect(),vt=Math.min(window.devicePixelRatio||1,2);Ul=Math.max(2,Math.round(rt.width*vt)),Vl=Math.max(2,Math.round(rt.height*vt)),M.width!==Ul&&(M.width=Ul),M.height!==Vl&&(M.height=Vl),Ke=Math.min(Ul/720,Vl/440);const at=Math.min(1024,Math.max(256,Math.round(vl*Ke*1.25)));at!==Tt&&eu(at)},"resize"),au=f(rt=>Array.from({length:nt},(at,Kt)=>({c:Kt,q:Af(Kt-rt+nt/2,nt)-nt/2})).sort((at,Kt)=>Math.abs(at.q)-Math.abs(Kt.q)).slice(0,4).map(({c:at,q:Kt})=>Math.abs(Kt)>2.05?{pose:[0,0,0],layer:-1}:{pose:Oh(Kt),layer:at}),"poseSet"),j=bt.current,an=f(rt=>{const vt=Rt.current;if(vt.seconds!==void 0){if(vt.reduced){const at=vt.seconds<lu?0:Math.floor((vt.seconds-lu)/vt.gap)+1;return{P:Et+at*vt.stepN,Pb:0,mix:0}}return{P:Dh(vt.seconds,Et,vt.stepN,vt.gap),Pb:0,mix:0}}if(j.mode==="spin"){const at=(rt-j.t0)*30;j.P=j.from+(j.to-j.from)*Vr(at,j.n),at>=j.n&&(j.mode="rest")}else if(j.mode==="spring"){const at=Math.min(.034,Math.max(0,rt-j.lastT));j.lastT=rt;const Kt=4;for(let Wt=0;Wt<Kt;Wt++){const zt=-60*(j.P-j.to)-13*j.v;j.v+=zt*at/Kt,j.P+=j.v*at/Kt}Math.abs(j.P-j.to)<4e-4&&Math.abs(j.v)<.003&&(j.P=j.to,j.v=0,j.mode="rest")}else if(j.mode==="fade"){const at=Math.min(1,(rt-j.fadeT0)/.45);return at>=1&&(j.mode="rest"),{P:j.P,Pb:j.fadeFrom,mix:1-at*at*(3-2*at)}}return{P:j.P,Pb:0,mix:0}},"progressAt"),Kl=new Float32Array(32),ya=new Float32Array(24),we=new Float32Array(24),un=f((rt,vt)=>{rt.forEach((at,Kt)=>{const Wt=vt+Kt;Kl[Wt*4]=at.pose[0],Kl[Wt*4+1]=at.pose[1],Kl[Wt*4+2]=at.pose[2],Kl[Wt*4+3]=at.layer;const zt=at.layer>=0?Ve[at.layer]:[255,255,255];ya[Wt*3]=zt[0]/255,ya[Wt*3+1]=zt[1]/255,ya[Wt*3+2]=zt[2]/255;const Il=at.layer>=0?Kr(at.pose):[0,1,0];we[Wt*3]=Il[0],we[Wt*3+1]=Il[1],we[Wt*3+2]=Il[2]})},"fill"),Je=f(rt=>{if(qt)return;const{P:vt,Pb:at,mix:Kt}=an(rt),Wt=au(vt);if(x){const{gl:zt,prog:Il,loc:Tl}=x;zt.viewport(0,0,Ul,Vl),zt.useProgram(Il),un(Wt,0),Kt>0&&un(au(at),4),zt.activeTexture(zt.TEXTURE0),zt.bindTexture(zt.TEXTURE_2D_ARRAY,x.tex),zt.uniform1i(Tl.uTex,0),zt.uniform2f(Tl.uRes,Ul,Vl),zt.uniform1f(Tl.uUnit,Ke),zt.uniform4fv(Tl.uPose,Kl),zt.uniform3fv(Tl.uGlowCol,ya),zt.uniform3fv(Tl.uGlowShape,we),zt.uniform3f(Tl.uBg,nl[0]/255,nl[1]/255,nl[2]/255),zt.uniform1f(Tl.uWarp,Math.max(0,Math.min(1,E))),zt.uniform1f(Tl.uMix,Kt),zt.drawArrays(zt.TRIANGLES,0,3)}else if(W){const zt=`rgb(${nl[0]}, ${nl[1]}, ${nl[2]})`;Qr(W,Ul,Vl,Ke,Wt,L,zt,Ve),Kt>0&&(W.globalAlpha=Kt,Qr(W,Ul,Vl,Ke,au(at),L,zt,Ve),W.globalAlpha=1)}},"draw"),ye=f(()=>{if(ft=0,qt||!j.visible)return;const rt=performance.now()/1e3,vt=Rt.current;vt.seconds===void 0&&vt.autoplay&&j.mode!=="drag"&&j.mode!=="spring"&&rt>=j.nextAuto&&(j.nextAuto=Math.max(j.nextAuto+vt.gap,rt+vt.gap*.5),j.autoPending=!0,p(pt.current+vt.stepN)),Je(rt),vt.seconds===void 0&&(j.mode!=="rest"||vt.autoplay)&&(ft=requestAnimationFrame(ye))},"loop"),Ft=f(()=>{!ft&&!qt&&j.visible&&(ft=requestAnimationFrame(ye))},"kick");Ct.current={kick:Ft,draw:f(()=>Je(performance.now()/1e3),"draw")};const Al=performance.now()/1e3;Rt.current.autoplay&&!Rt.current.reduced&&Rt.current.seconds===void 0?(j.from=it-Rt.current.stepN+ha,j.to=it+ha,j.t0=Al-Ef/30,j.n=Le,j.mode="spin",j.P=j.from+(j.to-j.from)*en(Ef),j.nextAuto=Al+lu):j.nextAuto=Al+Rt.current.gap,dl();const fl=new ResizeObserver(()=>{dl(),Je(performance.now()/1e3)});fl.observe(z);const nn=f(rt=>{const vt=performance.now()/1e3;if(rt!==j.visible){if(!rt)j.hiddenAt=vt;else{const at=vt-j.hiddenAt;j.t0+=at,j.fadeT0+=at,j.nextAuto+=at,j.lastT=vt}j.visible=rt,rt&&Ft()}},"setVisible");let uu=!0;const fn=new IntersectionObserver(rt=>{uu=rt.some(vt=>vt.isIntersecting),nn(uu&&document.visibilityState==="visible")});fn.observe(z);const We=f(()=>nn(uu&&document.visibilityState==="visible"),"onVis");document.addEventListener("visibilitychange",We);let me=!1;const wl=f(rt=>{rt.preventDefault(),me=!0},"onLost"),ke=f(()=>{me&&(me=!1,x=jr(M),Tt=0,dl(),Ft())},"onRestored");M.addEventListener("webglcontextlost",wl),M.addEventListener("webglcontextrestored",ke);const cl=document.fonts,cn=f(()=>{qt||(Tt=0,dl(),Je(performance.now()/1e3))},"repaint");return(nu=cl==null?void 0:cl.addEventListener)==null||nu.call(cl,"loadingdone",cn),Je(Al),Ft(),()=>{var rt;qt=!0,ft&&cancelAnimationFrame(ft),fl.disconnect(),fn.disconnect(),document.removeEventListener("visibilitychange",We),M.removeEventListener("webglcontextlost",wl),M.removeEventListener("webglcontextrestored",ke),(rt=cl==null?void 0:cl.removeEventListener)==null||rt.call(cl,"loadingdone",cn),x&&(x.gl.deleteTexture(x.tex),x.gl.deleteProgram(x.prog))}},[lt,C,H,E,N,nt]),Qt.useEffect(()=>{k!==void 0?Ct.current.draw():Ct.current.kick()},[k,D,gt]);const Y=f(z=>{var x,W;if(k!==void 0||z.button>0)return;const M=bt.current;(W=(x=z.currentTarget).setPointerCapture)==null||W.call(x,z.pointerId),M.mode="drag",M.dragX=z.clientX,M.downX=z.clientX,M.dragP=M.P,M.v=0,M.moved=!1,M.lastT=performance.now()/1e3,Ct.current.kick()},"onPointerDown"),J=f(z=>{const M=bt.current;if(M.mode!=="drag")return;const x=B.current.getBoundingClientRect(),W=Math.min(x.width/720,x.height/440),L=performance.now()/1e3,Tt=M.dragP-(z.clientX-M.dragX)/(W*300),ft=Math.max(1/240,L-M.lastT);M.v=.6*M.v+.4*((Tt-M.P)/ft),M.P=Tt,M.lastT=L,Math.abs(z.clientX-M.downX)>5&&(M.moved=!0),Ct.current.draw()},"onPointerMove"),At=f(z=>{const M=bt.current;if(M.mode!=="drag")return;const x=performance.now()/1e3;if(M.nextAuto=x+I,!M.moved){M.mode="rest";const ft=B.current.getBoundingClientRect(),qt=(z.clientX-ft.left-ft.width/2)/Math.min(ft.width/720,ft.height/440);qt>168?p(pt.current+1):qt<-168&&p(pt.current-1);return}x-M.lastT>.08&&(M.v=0);const W=Math.round(M.P+M.v*.16),L=Math.round(M.dragP-ha);M.to=W,M.mode="spring",M.lastT=x;const Tt=pt.current+(W-L);if(Tt!==pt.current){pt.current=Tt;const ft=Rt.current;ft.onIndexChange&&ft.onIndexChange(Af(Tt,ft.realCount)),ft.controlled||et(Tt)}Ct.current.kick()},"onPointerUp"),d=f(z=>{z.key!=="ArrowRight"&&z.key!=="ArrowLeft"||(z.preventDefault(),p(pt.current+(z.key==="ArrowRight"?1:-1)))},"onKeyDown"),U=lt[Af(it,nt)];return Dl.jsxs("div",{ref:B,className:P,role:"region","aria-roledescription":"carousel","aria-label":Q,tabIndex:0,onPointerDown:Y,onPointerMove:J,onPointerUp:At,onPointerCancel:At,onKeyDown:d,style:{position:"relative",width:"100%",height:"100%",minHeight:420,aspectRatio:"5 / 4",overflow:"hidden",background:C,touchAction:"pan-y",userSelect:"none",cursor:"grab",outline:"none",...ht},children:[Dl.jsx("canvas",{ref:K,"aria-hidden":"true",style:{position:"absolute",inset:0,width:"100%",height:"100%",display:"block"}}),Dl.jsx("div",{"aria-live":"polite",style:{position:"absolute",width:1,height:1,overflow:"hidden",clipPath:"inset(50%)"},children:U?`${U.title.replace(`
`," ")}: ${U.value}${U.unit||""}. ${U.footer||""}`:""})]})}f(Ch,"WarpCarousel");function Xh(){return Dl.jsx("main",{className:"relative h-screen min-h-[340px] w-full overflow-hidden",style:{backgroundColor:"#efefef"},children:Dl.jsx(Ch,{style:{width:"100%",height:"100%"}})})}f(Xh,"WarpCarouselDemo");function Gh(){const m=new URL(window.location.href).searchParams.get("theme");return Dl.jsx(gh,{defaultTheme:m||"light",enableSystem:!0,children:Dl.jsx("div",{className:"w-screen min-h-screen flex justify-center items-center",children:Dl.jsx(Rh,{})})})}f(Gh,"App");yh.createRoot(document.getElementById("root")).render(Dl.jsx(ch.StrictMode,{children:Dl.jsx(Gh,{})}));</script>
    <style rel="stylesheet" crossorigin>/*! tailwindcss v4.1.10 | MIT License | https://tailwindcss.com */@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-rotate-x:initial;--tw-rotate-y:initial;--
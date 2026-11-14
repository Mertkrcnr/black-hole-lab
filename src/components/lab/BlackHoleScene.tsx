import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, ShaderMaterial, Vector2 } from "three";
import type { Parameters, ViewMode } from "@/lib/lab-data";

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time,spin,zoom,angle,mode,grid,mass,intensity,incline;
uniform vec3 bg,hot,ember,gold,cool;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float stars(vec2 uv){
  float s=0.;
  for(float k=0.;k<3.;k+=1.){
    vec2 g=uv*(220.+k*90.)*vec2(1.65,1.);
    vec2 si=floor(g);
    float h=hash(si+k*19.);
    float tw=.7+.3*sin(time*(1.2+k*.4)+h*40.);
    s+=pow(max(0.,1.-length(fract(g)-.5)*2.),10.)*step(.991+k*.002,h)*(.12+h*.4)*tw;
  }
  return s;
}
void main(){
  vec2 p=(vUv-.5)*vec2(resolution.x/resolution.y,1.);
  p/=zoom;
  float tilt=-.08+sin(angle)*.1-incline*.35;
  p=rot(tilt)*p;
  float r=length(p);
  float mScale=clamp(log(mass)/log(10.)/10.,0.,1.);
  float radius=.128+mScale*.034;
  float lens=radius*radius*(1.45+spin*.55);
  vec2 lp=p*(1.-lens/max(r*r,.0018));
  vec3 col=bg;
  col+=vec3(stars(lp*zoom*vec2(resolution.y/resolution.x,1.)+.5))*smoothstep(radius*.9,radius*1.7,r);
  float einstein=exp(-abs(r-radius*1.58)*70.)*.07*intensity;
  col+=gold*einstein;
  col+=ember*exp(-r*(9.5-mScale*3.))*.12*intensity;
  float phi=atan(p.y,p.x);
  float flick=.88+.12*noise(vec2(phi*6.+time*.8,time*.3));
  float ring=exp(-abs(r-radius)*620.)*flick;
  float glow=exp(-abs(r-radius)*78.)*.48;
  float hz=exp(-max(r-radius,0.)*42.)*.28*(.9+.1*sin(time*.7));
  col+=(hot*ring+gold*glow+ember*hz)*(1.+(.22+spin*.32)*sin(phi+time*.16))*intensity;
  float photonR=radius*(1.48+.08*spin);
  col+=gold*exp(-abs(r-photonR)*160.)*.16*intensity;
  float speed=.22+spin*.62;
  float rearR=length(vec2(p.x,p.y*(1.08+incline*.9)));
  float rearRad=radius*1.18;
  float rear=exp(-abs(rearR-rearRad)*120.);
  vec2 rq=rot(-time*speed*.55)*p;
  float streak=.5+.4*noise(rq*vec2(70.,70.)+vec2(0.,rearR*280.));
  col+=mix(ember,hot,.6)*rear*streak*smoothstep(-.08,.03,p.y)*1.55*intensity;
  float under=exp(-abs(length(vec2(p.x,p.y*1.55))-rearRad*.98)*150.)*smoothstep(.02,-.07,p.y)*.4;
  col+=ember*under*intensity;
  float squash=mix(5.9,2.2,clamp(incline*1.6,0.,1.));
  float dy=p.y+.01;
  vec2 dp=vec2(p.x,dy*squash);
  float diskR=length(dp);
  float w=speed*(.48+.1/max(diskR,.12));
  vec2 dq=rot(time*w)*dp;
  vec2 dq2=rot(time*w*.62+1.7)*dp;
  float inner=smoothstep(radius+.006,radius+.04,diskR);
  float outer=1.-smoothstep(.22,.5+mScale*.06,diskR);
  float bands=pow(.5+.5*sin(diskR*760.+noise(dq*22.)*9.),2.);
  float turb=noise(dq*58.)*.55+noise(dq2*130.)*.45;
  float disk=inner*outer*(.2+bands*.52+turb*.58);
  float beaming=1.-p.x*(.55+spin*.55);
  vec3 diskColor=mix(ember,hot,pow(1.-smoothstep(.14,.48,diskR),2.));
  float front=step(dy,0.);
  float occlusion=smoothstep(radius-.007,radius+.003,r);
  disk*=max(front,occlusion);
  col+=diskColor*disk*max(beaming,.12)*1.65*intensity;
  vec2 pc=dq*58.;vec2 ci=floor(pc);float ph=hash(ci);
  float part=pow(max(0.,1.-length(fract(pc)-.5)*3.),6.)*step(.88,ph)*smoothstep(radius,radius+.07,diskR)*(1.-smoothstep(.28,.68,diskR));
  col+=mix(gold,hot,ph)*part*max(front,occlusion)*(.75+.25*sin(time*2.+ph*30.))*intensity;
  vec2 hp=rot(time*speed*.32)*p*42.;vec2 hi=floor(hp);float hh=hash(hi+7.);
  float dust=pow(max(0.,1.-length(fract(hp)-.5)*3.),8.)*step(.955,hh)*smoothstep(radius*1.15,radius*1.7,r)*(1.-smoothstep(.32,.62,r));
  col+=gold*dust*.55*occlusion*intensity;
  float diskGlow=exp(-abs(dy)*52.)*exp(-abs(p.x)*4.6)*.14;
  col+=gold*diskGlow*max(front,occlusion)*intensity;
  col*=mix(occlusion,1.,front*inner*outer*.85);
  col*=mix(1.,smoothstep(radius*.45,radius,r),1.-front*inner*outer);
  if(mode>.5&&mode<1.5){
    for(int i=0;i<6;i++){
      float yi=-.33+float(i)*.11;
      float pull=1.-.62/(1.+p.x*p.x*9.+.12);
      float yRay=yi*pull;
      float capture=smoothstep(radius*1.05,radius*.55,abs(yi));
      float fade=mix(1.,smoothstep(.12,-.02,p.x),capture);
      float ray=exp(-abs(p.y-yRay)*(280.-abs(yi)*80.))*fade;
      col+=cool*ray*.55;
    }
  }
  if(mode>1.5&&mode<2.5||grid>.5){
    vec2 q=p;float bend=.07/(r+.07);q*=1.+bend;
    vec2 g=abs(fract(q*14.+.5)-.5);
    float line=1.-smoothstep(.004,.012,min(g.x,g.y));
    float polar=abs(fract(atan(q.y,q.x)/6.283*18.)-.5);
    float ringG=1.-smoothstep(.02,.06,abs(length(q)*8.-floor(length(q)*8.)));
    col+=cool*(line*.14+ringG*.06*(1.-polar))*smoothstep(.12,.28,r);
  }
  if(mode>2.5&&mode<3.5){
    float grain=hash(vUv*resolution+fract(time))-.5;
    col+=grain*.045;
    col*=mix(vec3(1.05,.92,.78),vec3(.75,.88,1.08),.5+.5*p.x*spin);
    col*=smoothstep(1.15,.35,length(vUv-.5)*1.55);
  }
  if(mode>3.5){
    float rh=radius;
    float re=radius*2./max(1.+sqrt(max(1.-spin*spin,.0001)),.5);
    float rp=radius*(3.-spin*.38)/max(1.+sqrt(max(1.-spin*spin,.0001)),.5);
    col+=ember*exp(-abs(r-rh)*220.)*.45;
    col+=gold*exp(-abs(r-re)*180.)*.28;
    col+=cool*exp(-abs(r-rp)*140.)*.22;
  }
  col*=1.-.28*length(vUv-.5);
  col=col/(1.+col*.16);
  gl_FragColor=vec4(col,1.);
}`;

function tokenColor(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Color();
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  ctx.fillRect(0, 0, 1, 1);
  const p = ctx.getImageData(0, 0, 1, 1).data;
  return new Color((p[0] ?? 0) / 255, (p[1] ?? 0) / 255, (p[2] ?? 0) / 255);
}

function modeCode(mode: ViewMode) {
  if (mode === "light-ray") return 1;
  if (mode === "spacetime") return 2;
  if (mode === "observation") return 3;
  if (mode === "geometry") return 4;
  return 0;
}

function Singularity({
  parameters,
  paused,
  mode,
  showGrid,
  reset,
  onReady,
  onView,
}: {
  parameters: Parameters;
  paused: boolean;
  mode: ViewMode;
  showGrid: boolean;
  reset: number;
  onReady: () => void;
  onView?: (view: { theta: number; phi: number }) => void;
}) {
  const material = useRef<ShaderMaterial>(null);
  const ready = useRef(false);
  const clock = useRef(0);
  const lastView = useRef("");
  const { camera, size } = useThree();
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const uniforms = useMemo(
    () => ({
      resolution: { value: new Vector2(1, 1) },
      time: { value: 0 },
      spin: { value: 0.65 },
      zoom: { value: 1 },
      angle: { value: 0 },
      mode: { value: 0 },
      grid: { value: 0 },
      mass: { value: 10 },
      intensity: { value: 1 },
      incline: { value: 0.08 },
      bg: { value: tokenColor("--background") },
      hot: { value: tokenColor("--disk-hot") },
      ember: { value: tokenColor("--disk") },
      gold: { value: tokenColor("--primary") },
      cool: { value: tokenColor("--signal") },
    }),
    [],
  );

  useEffect(() => {
    const polar = Math.PI / 2 - (parameters.cameraAngle * Math.PI) / 180;
    const dist = reset > 0 ? 10 : camera.position.length() || 10;
    const az = reset > 0 ? 0 : Math.atan2(camera.position.x, camera.position.z);
    camera.position.set(
      dist * Math.sin(polar) * Math.sin(az),
      dist * Math.cos(polar),
      dist * Math.sin(polar) * Math.cos(az),
    );
    camera.lookAt(0, 0, 0);
  }, [parameters.cameraAngle, reset, camera]);

  useFrame((_, dt) => {
    if (!material.current) return;
    if (!paused && !reduced) clock.current += Math.min(dt, 0.05);
    const u = material.current.uniforms as typeof uniforms;
    u.resolution.value.set(size.width, size.height);
    u.time.value = clock.current;
    const k = Math.min(1, dt * 4);
    u.spin.value += (parameters.spin - u.spin.value) * k;
    u.mass.value += (parameters.mass - u.mass.value) * k;
    u.intensity.value += (parameters.intensity - u.intensity.value) * k;
    const len = camera.position.length();
    u.zoom.value =
      (size.width < 760 ? 1.45 : 1.2) *
      (10 / len) *
      (1 + Math.log10(parameters.mass / 10) * 0.018) *
      Math.pow(50 / parameters.distance, 0.12);
    u.angle.value = Math.atan2(camera.position.x, camera.position.z);
    u.incline.value += (camera.position.y / Math.max(len, 0.001) - u.incline.value) * k;
    u.mode.value = modeCode(mode);
    u.grid.value = showGrid ? 1 : 0;
    const theta =
      Math.acos(Math.min(1, Math.max(-1, camera.position.y / Math.max(len, 0.001)))) *
      (180 / Math.PI);
    const phi = (Math.atan2(camera.position.x, camera.position.z) * 180) / Math.PI;
    const key = `${theta.toFixed(1)}:${phi.toFixed(1)}`;
    if (key !== lastView.current) {
      lastView.current = key;
      onView?.({ theta, phi });
    }
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <>
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={18}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export default function BlackHoleScene(props: {
  parameters: Parameters;
  paused: boolean;
  mode: ViewMode;
  showGrid: boolean;
  reset: number;
  onView?: (view: { theta: number; phi: number }) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  return (
    <div className="scene" ref={wrapper} aria-label="Interactive black hole simulation">
      <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
        <Singularity
          {...props}
          onReady={() => {
            wrapper.current?.setAttribute("data-scene-ready", "true");
          }}
        />
      </Canvas>
    </div>
  );
}

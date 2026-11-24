/* GoldSrc BSP v30 renderer and collision hull adapter.
   Coordinates are original engine units, transformed (x,y,z) -> (x,z,-y).
   BSP, texture and lighting assets retain their original authorship. */
// Night-shift scenery uses the existing BSP surfaces and their baked shadows.
const nightLocations = {
  de_dust2: [
    // Center, outward-facing yaw in degrees, panel width, route mark, Chinese and English names, enamel.
    [[300,-40,-2048],180,236,'CT','转运调度','TRANSIT CONTROL','#68f3dc'],
    [[340,-40,-2528],0,272,'02','地下通廊','LOWER CONCOURSE','#99b7ff'],
    [[-780,250,1024],180,284,'T','货运集散','FREIGHT EXCHANGE','#82ead6'],
    [[-1344,165,-2495],-90,224,'B','保税货场','BONDED FREIGHT','#80f0dc'],
    [[288,205,-2430],90,178,'A','高架装卸','UPPER LOADING','#ffb879'],
    [[-128,80,-1150],90,204,'M','中路通廊','CENTRAL PASSAGE','#b9a0fa'],
    [[960,160,-440],-90,180,'A','长街入口','LONG APPROACH','#ffb879']
  ],
  cs_assault: [
    [[832,116,-240],-90,176,'CT','接应街区','RESCUE DISTRICT','#6eece5'],
    [[-450,142,-512],0,242,'04','西侧街区','WEST BLOCK','#a9abff'],
    [[200,210,-1600],0,300,'W','机修总厂','MACHINE WORKS','#e6a1fa'],
    [[-440,118,-896],180,192,'E','街区出口','STREET EXIT','#75ead9'],
    [[-150,218,-1616],180,205,'01','装配车间','ASSEMBLY HALL','#d99bfc'],
    [[-180,412,-2880],0,250,'02','上层走道','UPPER GANTRY','#ffb678'],
    [[-890,403,-2368],180,188,'H','值班室','DUTY OFFICE','#7deee4']
  ]
};

function nightRandom(seed) {
  return () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
}
function nightCanvas(width,height) {
  const canvas=document.createElement('canvas');
  canvas.width=width; canvas.height=height;
  return canvas.getContext('2d');
}
function nightTexture(ctx) {
  const texture=new THREE.CanvasTexture(ctx.canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

// A seamless cylindrical skyline. Each district gets its own silhouette, antennae and window pattern.
function paintNightSky(works) {
  const w=4096,h=2048,ctx=nightCanvas(w,h),rng=nightRandom(works?814:321);
  const horizon=h*.51;
  const sky=ctx.createLinearGradient(0,h*.15,0,h*.60);
  sky.addColorStop(0,'#0a1326'); sky.addColorStop(.50,works?'#252440':'#1f3049');
  sky.addColorStop(.83,works?'#534365':'#405671'); sky.addColorStop(1,'#63627b');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
  for(let i=0;i<950;i++){
    ctx.globalAlpha=.12+rng()*.38;ctx.fillStyle='#dce9fb';
    ctx.fillRect(rng()*w,h*.15+rng()*h*.31,1+rng()*1.2,1);
  }
  ctx.globalAlpha=1;
  const glow=(x,y,r,color)=>{
    const grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');
    ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);
  };
  for(let i=0;i<15;i++){
    const x=(i+.5)*w/15, r=150+rng()*120;
    for(const dx of [-w,0,w])glow(x+dx,horizon-70,r,i%3===0?'#e588ab24':'#85dcff21');
  }
  const accents=['#78d9df','#c193ca','#dfad87','#a7b3dc'];
  for(let layer=0;layer<3;layer++){
    const buildings=[];
    for(let x=-10;x<w;){
      const width=13+Math.floor(rng()*(22+layer*16));
      const height=22+Math.floor(Math.pow(rng(),1.5)*(75+layer*84));
      const y=horizon+layer*5-height;
      buildings.push([x,y,width,height,Math.floor(rng()*1000000)]);x+=width+2+rng()*8;
    }
    for(const [base,y,bw,bh,seed] of buildings)for(const dx of [-w,0,w]){
      const x=base+dx;if(x>w||x+bw<0)continue;
      const local=nightRandom(seed), accent=accents[seed%accents.length];
      ctx.fillStyle=['#39435a','#2b354e','#19283e'][layer];
      ctx.fillRect(x,y,bw,bh+120);
      ctx.fillStyle=['#313e54','#23334a','#152235'][layer];ctx.fillRect(x+bw*.76,y,bw*.24,bh+120);
      ctx.fillRect(x+bw*.12,y-5,bw*.64,6);
      if(seed%4===0){ctx.fillRect(x+bw*.36,y-18,bw*.34,18);ctx.fillRect(x+bw*.56,y-37,1,24);ctx.fillStyle='#ed91a7';ctx.fillRect(x+bw*.56-1,y-38,3,2);}
      for(let yy=y+6;yy<y+bh;yy+=5+layer)for(let xx=x+3;xx<x+bw-3;xx+=5+layer){
        if(local()>.50)continue;
        ctx.fillStyle=local()>.75?accent:'#7f9cae';ctx.globalAlpha=(.17+local()*.65)*(layer+2)/4;
        ctx.fillRect(xx,yy,local()>.75?4:2,1.5);
      }
      ctx.globalAlpha=1;
      if(layer>0&&seed%4===0){
        ctx.shadowColor=accent;ctx.shadowBlur=4;ctx.fillStyle=accent;
        ctx.fillRect(x+1,y+2,bw*.72,1.5);
        if(seed%3===0)ctx.fillRect(x+2,y+2,1.5,bh*.74);ctx.shadowBlur=0;
      }
    }
  }
  ctx.fillStyle='#19283e';ctx.fillRect(0,horizon+26,w,h);
  const tex=nightTexture(ctx);
  tex.mapping=THREE.EquirectangularReflectionMapping;
  return tex;
}

function nightSignTexture(mark,title,english,accent) {
  const ctx=nightCanvas(1024,256);
  ctx.fillStyle='#101b2c';ctx.fillRect(0,0,1024,256);
  const wash=ctx.createLinearGradient(0,0,1024,256);
  wash.addColorStop(0,accent+'30');wash.addColorStop(1,'#15203100');
  ctx.fillStyle=wash;ctx.fillRect(0,0,1024,256);
  ctx.strokeStyle='#506675';ctx.lineWidth=3;ctx.strokeRect(4,4,1016,248);
  ctx.fillStyle=accent;ctx.fillRect(6,6,9,244);ctx.fillRect(38,215,946,3);
  ctx.fillStyle='#132134';ctx.fillRect(34,29,190,163);
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(34,29,190,163);
  ctx.fillStyle=accent;ctx.textAlign='center';ctx.font='bold 112px "Arial Narrow",Arial,sans-serif';ctx.fillText(mark,130,151,177);
  ctx.shadowBlur=5;ctx.shadowColor=accent+'66';ctx.textAlign='left';ctx.font='bold 75px "Microsoft YaHei",sans-serif';ctx.fillText(title,252,114,711);
  ctx.shadowBlur=0;ctx.font='bold 32px Consolas,monospace';ctx.fillText(english,255,174,712);
  for(let i=0;i<17;i++)ctx.fillRect(798+i*11,231,2+(i%4),8);
  for(const x of [20,1004])for(const y of [18,238]){ctx.fillStyle='#88939b';ctx.fillRect(x-2,y-2,4,4);}
  return nightTexture(ctx);
}

function nightSurfaceAtlas(cargo,works) {
  const ctx=nightCanvas(512,512), rng=nightRandom(cargo?359:98);
  const shade=works?['#4d5264','#454958','#363d4c']:['#4b5b65','#44545f','#394954'];
  ctx.fillStyle=cargo?(works?'#785464':'#496e74'):shade[0];ctx.fillRect(0,0,512,512);
  if(cargo){
    // Pressed ribs, folded rails and identification stencil on a shipping case.
    for(let x=10;x<502;x+=33){
      const rib=ctx.createLinearGradient(x,0,x+28,0);
      rib.addColorStop(0,'#0005');rib.addColorStop(.18,'#0001');rib.addColorStop(.28,'#fff2');rib.addColorStop(.85,'#fff1');rib.addColorStop(1,'#0005');
      ctx.fillStyle=rib;ctx.fillRect(x,12,28,488);
    }
    ctx.fillStyle='#e1d4b8';ctx.fillRect(37,80,5,76);
    ctx.font='bold 32px Consolas,monospace';ctx.fillText(works?'MAINT / 09':'TRANSIT / 02',57,115);
    ctx.font='bold 18px Consolas,monospace';ctx.fillText(works?'PARTS  •  WH':'FREIGHT  •  YD',58,147);
    ctx.fillStyle='#192d35';ctx.fillRect(344,370,123,61);
    ctx.fillStyle='#c4d2c5';for(let i=0;i<26;i++)ctx.fillRect(354+i*4,381,1+i%3,27);
    ctx.fillRect(355,414,72,3);
    for(let i=0;i<4;i++){ctx.fillStyle='#d5a766';ctx.beginPath();ctx.moveTo(40+i*26,431);ctx.lineTo(52+i*26,431);ctx.lineTo(68+i*26,407);ctx.lineTo(56+i*26,407);ctx.fill();}
    for(const y of [3,492]){ctx.fillStyle='#243640';ctx.fillRect(0,y,512,14);ctx.fillStyle='#798284';ctx.fillRect(0,y,512,3);}
  }else{
    // Service cladding. The off-center joint breaks up wide BSP walls.
    ctx.fillStyle=shade[1];ctx.fillRect(0,0,170,405);ctx.fillStyle=shade[2];ctx.fillRect(0,407,512,105);
    for(const [x,y,w,h] of [[4,4,160,396],[171,4,336,396],[4,409,503,99]]){
      ctx.strokeStyle='#263743';ctx.lineWidth=5;ctx.strokeRect(x,y,w,h);
      ctx.strokeStyle='#77818b';ctx.lineWidth=1.5;ctx.strokeRect(x+3,y+3,w-5,h-5);
      for(const xx of [x+10,x+w-10])for(const yy of [y+11,y+h-11]){
        ctx.fillStyle='#27333a';ctx.fillRect(xx-2,yy-1,5,4);ctx.fillStyle='#849099';ctx.fillRect(xx-2,yy-2,4,1);
      }
    }
    for(let i=0;i<13;i++){ctx.fillStyle='#27363f';ctx.fillRect(343+i*10,436,5,32);ctx.fillStyle='#687581';ctx.fillRect(343+i*10,436,1,32);}
  }
  for(let i=0;i<13500;i++){
    ctx.fillStyle=rng()>.47?'#141d2820':'#b3bac416';ctx.fillRect(rng()*512,rng()*512,1+rng()*2,1+rng()*3);
  }
  for(let i=0;i<130;i++){
    ctx.fillStyle=i%3?'#10172218':'#a1a6a41e';ctx.fillRect(rng()*512,rng()*512,.7+rng(),2+rng()*32);
  }
  const tex=nightTexture(ctx);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}

// Enamel letters with luminous tubing, mounted on a steel rack above the district entrance.
function addNightMarquee(group,works,resources){
  const ctx=nightCanvas(1280,256);
  const accent=works?'#f6a7fd':'#ffb37a';
  ctx.fillStyle='#0b1722';ctx.fillRect(25,29,1230,200);
  ctx.fillStyle='#233742';for(let x=28;x<1250;x+=11)ctx.fillRect(x,31,2,195);
  ctx.strokeStyle='#59858a';ctx.lineWidth=4;ctx.strokeRect(25,28,1230,200);
  ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.lineJoin='round';ctx.shadowColor=accent;ctx.shadowBlur=13;
  // Interlocking cargo chevrons mark the freight depot. A pulse trace marks the machine hall.
  ctx.beginPath();
  if(works){ctx.moveTo(60,138);ctx.lineTo(91,138);ctx.lineTo(110,75);ctx.lineTo(133,182);ctx.lineTo(152,107);ctx.lineTo(177,107);}
  else{for(let i=0;i<3;i++){let y=63+i*34;ctx.moveTo(62,y);ctx.lineTo(111,y+24);ctx.lineTo(161,y);}}
  ctx.stroke();ctx.font='900 128px "Arial Narrow",Arial,sans-serif';
  const text=works?'ARC WORKS':'NIGHT FREIGHT';
  ctx.textAlign='left';ctx.strokeText(text,217,169,986);
  ctx.fillStyle=works?'#ac6daf':'#a96b47';ctx.shadowBlur=0;ctx.fillText(text,217,169,986);
  ctx.lineWidth=1.6;ctx.strokeStyle='#fff1da';ctx.strokeText(text,217,169,986);
  ctx.fillStyle=accent;ctx.fillRect(58,201,112,4);ctx.fillRect(218,200,978,2);
  const width=works?330:286,h=width/5,tex=nightTexture(ctx);
  const surface=new THREE.PlaneGeometry(width,h);
  const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.02,fog:false});
  const root=new THREE.Group(),face=new THREE.Mesh(surface,material);
  const point=works?[200,332,-1596]:[-1317,304,-2520];
  root.position.fromArray(point);root.rotation.y=works?0:-Math.PI/2;root.add(face);
  const metal=new THREE.MeshBasicMaterial({color:0x263841}),steel=new THREE.BoxGeometry(1,1,1);
  function bar(x,y,z,a,b,c,tilt=0){
    const beam=new THREE.Mesh(steel,metal);beam.scale.set(a,b,c);beam.position.set(x,y,z);beam.rotation.z=tilt;root.add(beam);
  }
  for(const side of [-1,1]){
    bar(side*width*.37,-h*.44,-2,3,h*1.25,3);
    bar(side*width*.31,-h*.58,-3,3,h*.93,2,side*.77);
  }
  bar(0,-h*.42,-2,width*.94,3,4);
  group.add(root);
  resources.geometries.push(surface,steel);resources.materials.push(material,metal);resources.textures.push(tex);
  return {point,width,accent};
}

// A two-window factory bay. Frame, glass, blinds and masonry occupy the same UV tile.
function nightFacade(){
  const ctx=nightCanvas(512,384), rng=nightRandom(419);
  ctx.fillStyle='#414757';ctx.fillRect(0,0,512,384);
  for(let row=0;row<24;row++)for(let col=-1;col<12;col++){
    const v=Math.floor(48+rng()*14);ctx.fillStyle='rgb('+v+','+(v+6)+','+(v+12)+')';
    ctx.fillRect(col*48+(row%2)*24,row*16,46,14);
  }
  for(const x of [35,268]){
    ctx.fillStyle='#232e40';ctx.fillRect(x-7,76,213,194);
    ctx.fillStyle='#88939b';ctx.fillRect(x-7,74,213,4);
    ctx.fillStyle='#61727f';ctx.fillRect(x-4,80,207,183);
    ctx.fillStyle='#182335';ctx.fillRect(x+2,85,194,171);
    const glass=ctx.createLinearGradient(0,90,0,251);glass.addColorStop(0,'#39495b');glass.addColorStop(1,'#172638');
    ctx.fillStyle=glass;ctx.fillRect(x+8,91,183,159);
    for(let y=94;y<158;y+=9){ctx.fillStyle='#7b879044';ctx.fillRect(x+8,y,183,3);}
    ctx.fillStyle='#2f3c4a';ctx.fillRect(x+95,88,6,166);ctx.fillRect(x+5,154,188,5);
    ctx.fillStyle='#98a1a3';ctx.fillRect(x+95,89,1,163);
    ctx.fillStyle='#18232e';ctx.fillRect(x-12,266,224,10);ctx.fillStyle='#697681';ctx.fillRect(x-12,264,224,5);
  }
  ctx.fillStyle='#222e3e';ctx.fillRect(0,346,512,15);ctx.fillStyle='#75828b';ctx.fillRect(0,344,512,4);
  const tex=nightTexture(ctx);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.flipY=false;tex.anisotropy=4;return tex;
}

// Sample the highest horizontal BSP face at each fixed rain column. The streaks end
// above roofs, bridges and pavement and never descend into the rooms beneath them.
function createDistrictRain(modelGroups,resources,works){
  const spacing=45, grid=new Map(), rng=nightRandom(works?8839:4121);
  modelGroups[0].traverse(mesh=>{
    if(!mesh.isMesh)return;
    const points=mesh.geometry.attributes.position.array;
    for(let i=0;i<points.length;i+=9){
      const [ax,ay,az,bx,by,bz,cx,cy,cz]=points.subarray(i,i+9);
      const x1=bx-ax,z1=bz-az,x2=cx-ax,z2=cz-az,det=x1*z2-x2*z1;
      if(Math.abs(det)<1)continue;
      const xMin=Math.floor(Math.min(ax,bx,cx)/spacing),xMax=Math.ceil(Math.max(ax,bx,cx)/spacing);
      const zMin=Math.floor(Math.min(az,bz,cz)/spacing),zMax=Math.ceil(Math.max(az,bz,cz)/spacing);
      for(let iz=zMin;iz<zMax;iz++)for(let ix=xMin;ix<xMax;ix++){
        const key=ix+','+iz;
        let column=grid.get(key);
        if(!column){
          column={x:(ix+.1+.8*rng())*spacing,z:(iz+.1+.8*rng())*spacing,y:-Infinity};
          grid.set(key,column);
        }
        const x=column.x-ax,z=column.z-az,u=(x*z2-z*x2)/det,v=(z*x1-x*z1)/det;
        if(u>=0&&v>=0&&u+v<=1)column.y=Math.max(column.y,ay+u*(by-ay)+v*(cy-ay));
      }
    }
  });
  const points=[], drops=[];
  for(const {x,y,z} of grid.values()){
    if(!Number.isFinite(y)||rng()>.79)continue;
    const phase=rng(),speed=.85+rng()*.4,length=10+rng()*11;
    points.push(x,y+6,z,x,y+6,z);
    drops.push(phase,speed,0,phase,speed,length);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geo.setAttribute('drop',new THREE.Float32BufferAttribute(drops,3));
  const mat=new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},transparent:true,depthWrite:false,
    vertexShader:`attribute vec3 drop; uniform float time; varying float alpha;
    void main(){
      float t=fract(drop.x-time*.79*drop.y);
      vec3 p=position+vec3(-drop.z*.15,t*620.+drop.z,0.);
      alpha=(1.-smoothstep(320.,1700.,distance(p,cameraPosition)))*smoothstep(0.,.05,t)*(1.-smoothstep(.87,1.,t));
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
    }`,
    fragmentShader:`varying float alpha;void main(){gl_FragColor=vec4(.62,.74,.84,.18*alpha);}`
  });
  const mesh=new THREE.LineSegments(geo,mat);mesh.frustumCulled=false;
  resources.geometries.push(geo);resources.materials.push(mat);
  return {mesh,time:mat.uniforms.time};
}

function createNightDistrict(name, group, resources) {
  const works=name==='cs_assault', signs=nightLocations[name];
  const sky=paintNightSky(works);
  const cladding=nightSurfaceAtlas(false,works), cargo=nightSurfaceAtlas(true,works);
  const facade=works?nightFacade():cladding;
  if(works)resources.textures.push(facade);
  cargo.flipY=false;resources.textures.push(sky,cladding,cargo);
  const colors=[], positions=[], normals=[];
  for(const [point,yaw,width,mark,title,english,accent] of signs){
    const angle=yaw*Math.PI/180, normal=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    const face=new THREE.PlaneGeometry(width,width/4), tex=nightSignTexture(mark,title,english,accent);
    tex.anisotropy=8;
    const mat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false,fog:false});
    const panel=new THREE.Mesh(face,mat);
    panel.position.fromArray(point).addScaledVector(normal,1.3);panel.rotation.y=angle;
    group.add(panel);resources.geometries.push(face);resources.materials.push(mat);resources.textures.push(tex);
    colors.push(new THREE.Color(accent));positions.push(new THREE.Vector4(...point,width));
    normals.push(new THREE.Vector2(normal.x,normal.z));
  }
  const marquee=addNightMarquee(group,works,resources);
  colors.push(new THREE.Color(marquee.accent));positions.push(new THREE.Vector4(...marquee.point,marquee.width));
  normals.push(works?new THREE.Vector2(0,1):new THREE.Vector2(-1,0));
  const uniforms={uBurstLight:blastLightUniform,uFacade:{value:facade},
    uCladding:{value:cladding}, uCargo:{value:cargo}, uNightSky:{value:sky},
    uSignColor:{value:colors},uSignPos:{value:positions},uSignNormal:{value:normals}
  };
  // Keep authored navigation paint, doors, grates and lightmaps legible on their original faces.
  function surfaceType(textureName) {
    const t=textureName.toLowerCase();
    if(/light|_lgt|skkylite|lab1_comp|viewscreen/.test(t))return 'LAMP';
    if(/crate|crte|sandcrt|bcontainer/.test(t))return 'CARGO';
    if(/sandrock|rockwall|sandtrim|sandwllwndw|cssandwall(?:bt|gh|dj)|^sandccrete|crete3_wall|c_tnnl_ccrete|^c_stone1$/.test(t))return 'TERRAIN';
    if(/^(?:-0cssandwall|out_wall4b|metal_wall05b|silo2_cor|c1a1c_w2|tnnl_w5f|c1a0_labw5)$/.test(t))return 'CLADDING';
    if(works&&/c_bldg|c_stone1_w/.test(t))return 'FACADE';
    if(/wll(do|door)|_dr|basetrim|tnnl_w|out_w|duct_|c_rockwall|^sandtrim/.test(t))return 'HARDWARE';
    if(/sandroad|^-\dsand$|out_pave|gravel|_flr|sidewlk|crete4_flr|labflr|out_grss/.test(t))return 'PAVING';
    return 'ORIGINAL';
  }
  function dress(material,textureName) {
    const type=surfaceType(textureName);
    const dressed=/sandtrim|wllwndw|cssandwall(?:bt|gh|dj)/i.test(textureName);
    const tileIndex=type==='TERRAIN'?(/rock|trim|wndw|cssandwall/i.test(textureName)?0:2):
      (/gravel|grss|^-\dsand$/i.test(textureName)?1:/pave|road/i.test(textureName)?3:2);
    const ground=terrainTiles[tileIndex];
    material.defines={...material.defines,['DISTRICT_'+type]:1,SIGN_COUNT:positions.length};
    if(dressed)material.defines.DRESSED_STONE=1;
    if(works)material.defines.MACHINE_WORKS=1;
    if(textureName.toLowerCase()==='sandroadtgtb')material.defines.TARGET_FLOOR=1;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms,{uGround:{value:ground.albedo},uGroundRelief:{value:ground.relief},uGroundScale:{value:[134,85,170,95][tileIndex]}});
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
        varying vec3 districtP; varying vec3 districtN;`)
        .replace('#include <begin_vertex>',`#include <begin_vertex>
        districtP=(modelMatrix*vec4(position,1.0)).xyz; districtN=mat3(modelMatrix)*normal;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        uniform sampler2D uCladding,uCargo,uNightSky,uFacade,uGround,uGroundRelief;uniform float uGroundScale;
        uniform vec4 uBurstLight[2]; uniform vec4 uSignPos[SIGN_COUNT]; uniform vec3 uSignColor[SIGN_COUNT]; uniform vec2 uSignNormal[SIGN_COUNT];
        varying vec3 districtP; varying vec3 districtN;
        float streetNoise(vec2 p){
          vec2 cell=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          vec4 h=fract(sin(mod(dot(cell,vec2(37.7,19.3))+vec4(0.,37.7,19.3,57.),381.))*4375.291);
          return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
        }
        float stripMask(float pos,float center,float radius){return 1.-smoothstep(radius,radius+max(fwidth(pos),.32),abs(pos-center));}
      `).replace('#include <opaque_fragment>',`
        vec3 p=districtP, n=normalize(districtN);
        // BSP triangle winding varies. For a horizontal face its visible side decides wetness.
        if(dot(n,cameraPosition-p)<0.)n=-n;
        vec3 viewDir=normalize(cameraPosition-p);
        vec3 original=diffuseColor.rgb;
        float ink=dot(original,vec3(.29,.57,.14));
        float shade=clamp(dot(lightMapTexel.rgb,vec3(.28,.56,.16)),0.,1.);
        float faceLight=.91+.09*dot(n,normalize(vec3(-.6,.8,.4)));
        vec3 baked=mix(vec3(.38,.44,.57),vec3(1.08,1.16,1.22),sqrt(shade))*faceLight;
        vec3 base=mix(vec3(ink)*vec3(.51,.70,.86),original*vec3(.72,.81,.96),.43);
        vec3 glow=vec3(0.);
        float lateral=abs(n.x)>abs(n.z)?p.z:p.x;
        vec2 wallUv=vec2(lateral,p.y);
        #ifdef MACHINE_WORKS
          vec3 lineColor=vec3(.46,.18,.67);
        #else
          vec3 lineColor=vec3(.07,.53,.51);
        #endif
        #ifdef DISTRICT_CLADDING
          vec2 st=abs(n.y)>.65?p.xz/235.:wallUv/vec2(282.,165.);
          vec3 shell=texture2D(uCladding,st).rgb;
          base=shell*(.71+sqrt(ink)*.70);
          if(abs(n.y)<.4){
            vec2 cell=floor(st);
            float wallDepth=abs(n.x)>abs(n.z)?p.x:p.z;
            float sideId=floor((wallDepth+6.137)/80.);
            float seed=fract(sin(mod(dot(cell,vec2(18.13,31.27))+sideId*4.7,351.))*247.41);
            vec2 q=fract(st)*vec2(282.,165.);
            float segment=smoothstep(22.,27.,q.x)*(1.-smoothstep(157.,163.,q.x));
            float bracket=stripMask(q.y,35.,2.5)*segment;
            base*=1.-bracket*.72;
            vec3 tube=mix(lineColor,vec3(.92,.46,.14),step(.82,seed));
            float envelope=exp(-abs(q.y-35.)*.12)*segment;
            glow+=step(.38,seed)*tube*(envelope*.22+stripMask(q.y,35.,.85)*segment*1.15);
          }
        #elif defined(DISTRICT_CARGO)
          vec2 cargoUv=vMapUv;
          if(abs(n.y)<.5){
            // Some original crate faces mirror their UVs. Keep stencils upright and readable.
            vec2 dx=dFdx(vMapUv),dy=dFdy(vMapUv);
            float signDet=sign(dx.x*dy.y-dx.y*dy.x);
            vec3 uAxis=(dFdx(p)*dy.y-dFdy(p)*dx.y)*signDet;
            vec3 vAxis=(dFdy(p)*dx.x-dFdx(p)*dy.x)*signDet;
            if(dot(uAxis,cross(vec3(0.,1.,0.),n))<0.)cargoUv.x=-cargoUv.x;
            if(vAxis.y>0.)cargoUv.y=-cargoUv.y;
          }
          vec3 freight=texture2D(uCargo,cargoUv).rgb;
          base=freight*(.72+.47*sqrt(ink));
        #elif defined(DISTRICT_FACADE)
          if(abs(n.y)<.35){
            vec2 st=vec2(lateral/230.,-p.y/148.);
            vec2 px=fract(st)*vec2(512.,384.);
            base=texture2D(uFacade,st).rgb*(.77+.38*sqrt(ink));
            float rightBay=step(256.,px.x), x=px.x-mix(35.,268.,rightBay);
            float glass=step(8.,x)*step(x,191.)*step(91.,px.y)*step(px.y,250.);
            glass*=1.-step(95.,x)*step(x,101.);
            glass*=1.-step(154.,px.y)*step(px.y,159.);
            float room=streetNoise(vec2(floor(st.x)*2.+rightBay,floor(st.y))*.87);
            float lit=smoothstep(.38,.74,room);
            vec3 tint=mix(vec3(.09,.33,.35),vec3(.64,.37,.22),smoothstep(.65,.78,room));
            tint=mix(tint,vec3(.42,.23,.50),step(.87,room));
            float blinds=mix(.23+.44*smoothstep(1.,5.,mod(px.y,9.)),1.,step(156.,px.y));
            glow+=glass*tint*lit*blinds*mix(.35,.70,1.-px.y/384.);
          }
        #elif defined(DISTRICT_HARDWARE)
          base=mix(base,vec3(ink)*vec3(.56,.76,.82),.48);
        #elif defined(DISTRICT_LAMP)
          glow+=mix(vec3(.15,.65,.62),vec3(.77,.39,.70),.5+.5*sin(p.x*.006+p.z*.001))*smoothstep(.08,.62,ink);
        #elif defined(DISTRICT_TERRAIN) || defined(DISTRICT_PAVING)
          // World-space projections keep steep slopes at the same texel density as the walking surface.
          vec3 weights=pow(abs(n),vec3(6.));weights/=max(dot(weights,vec3(1.)),.001);
          vec3 q=p/uGroundScale;
          vec2 uvX=vec2(q.z,-q.y),uvY=q.xz,uvZ=vec2(q.x,-q.y);
          vec3 grain=texture2D(uGround,uvX).rgb*weights.x+texture2D(uGround,uvY).rgb*weights.y+texture2D(uGround,uvZ).rgb*weights.z;
          vec3 fine=texture2D(uGroundRelief,uvX).rgb*weights.x+texture2D(uGroundRelief,uvY).rgb*weights.y+texture2D(uGroundRelief,uvZ).rgb*weights.z;
          float weather=streetNoise(p.xz*.003+p.y*.001);
          float toolMarks=clamp(.94+dot(fine.rg-.5,vec2(.68,-.62)),.67,1.18);
          #ifdef DISTRICT_TERRAIN
            base=grain*vec3(.78,.89,1.0)*mix(.83,1.12,weather)*toolMarks;
            #ifdef DRESSED_STONE
              // Preserve the authored arch relief and the original route stencils.
              base*=.58+.94*sqrt(ink);
              float stencil=smoothstep(.035,.17,max(original.r,original.b)-original.g*1.2);
              base=mix(base,original*vec3(.86,.91,1.),stencil*.87);
              base=mix(base,original*.72,(1.-smoothstep(.012,.065,ink))*.80);
            #endif
          #else
            base=(grain*vec3(.55,.68,.82)+vec3(.012,.017,.024))*(.81+.32*weather)*toolMarks;
            #ifdef TARGET_FLOOR
              float mark=smoothstep(.035,.24,original.r-max(original.g,original.b)*1.65);
              base=mix(base,vec3(.57,.17,.046),mark);
            #endif
          #endif
        #endif
        vec3 spill=vec3(0.), reflection=vec3(0.);
        float wet=0.;
        vec3 reflected=reflect(-viewDir,n);
        #if defined(DISTRICT_PAVING) || defined(DISTRICT_CLADDING) || defined(DISTRICT_ORIGINAL)
          if(n.y>.72){
            float pools=streetNoise(p.xz*.009)+.29*streetNoise(p.xz*.037);
            wet=smoothstep(.38,.81,pools);
            #ifdef DISTRICT_PAVING
              wet*=.52+.48*smoothstep(.10,.58,1.-fine.b);
            #endif
            float ripple=streetNoise(p.xz*vec2(.025,.18));
            reflected.xz+=(ripple-.5)*.075;
            vec3 r=normalize(reflected);
            vec2 skyUV=vec2(atan(r.z,r.x)*.15915494+.5,asin(clamp(r.y,-1.,1.))*.31830989+.5);
            reflection=texture2D(uNightSky,skyUV).rgb*(.16+.56*pow(1.-max(n.y*viewDir.y,0.),2.));
            base*=1.-.32*wet;
          }
        #endif
        for(int i=0;i<SIGN_COUNT;i++){
          vec3 delta=p-uSignPos[i].xyz;
          vec2 sn=uSignNormal[i], tangent=vec2(sn.y,-sn.x);
          float front=dot(delta.xz,sn), across=dot(delta.xz,tangent);
          float w=uSignPos[i].w;
          vec3 d=vec3(max(abs(across)-w*.45,0.),delta.y,front);
          float nearLight=max(0.,1.-dot(d,d)/(w*w*1.20));
          spill+=uSignColor[i]*nearLight*nearLight*smoothstep(-12.,2.,front)*.28;
          if(wet>.01 && front>0.){
            float denom=dot(reflected.xz,sn);
            if(denom<-.035){
              float travel=-front/denom;
              vec3 at=delta+reflected*travel;
              vec2 outside=max(abs(vec2(dot(at.xz,tangent),at.y))-vec2(w*.48,w*.12),0.);
              float blur=8.+travel*.043;
              float streak=exp(-dot(outside,outside)/(blur*blur));
              reflection+=uSignColor[i]*streak*.50/(1.+travel*.0018);
            }
          }
        }
        outgoingLight=base*baked+glow+spill*(.27+base*2.)+wet*reflection;
        for(int i=0;i<2;i++){
          if(uBurstLight[i].w>0.){
            vec3 ray=uBurstLight[i].xyz-p;float d=length(ray);
            float falloff=max(0.,1.-d/265.);
            float facing=max(0.,dot(n,ray/max(d,.01)));
            outgoingLight+=vec3(1.,.43,.13)*uBurstLight[i].w*falloff*falloff*facing*(.20+base*2.6);
          }
        }
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=> 'night-bsp-'+type+(works?'-works':'-transit');
  }
  return {sky,dress};
}

async function createGoldSrcMap(THREE, data, scene) {
  const group = new THREE.Group();
  group.name = data.name;
  const loader = new THREE.TextureLoader();
  const ownedTextures = [];
  const loadTexture = async (url) => {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    ownedTextures.push(texture);
    return texture;
  };
  const textures = await Promise.all(data.textures.map(async (entry) => {
    const texture = await loadTexture(entry.image);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.flipY = false;
    texture.anisotropy = 4;
    return texture;
  }));
  const lightmap = await loadTexture(data.lightmap);
  lightmap.flipY = false;
  lightmap.generateMipmaps = false;
  lightmap.minFilter = THREE.LinearFilter;
  lightmap.channel = 1;
  const materials = textures.map((texture, index) => new THREE.MeshBasicMaterial({
    map: texture,
    lightMap: lightmap,
    lightMapIntensity: data.name === 'cs_assault' ? 1.7 : 1,
    alphaTest: data.textures[index].name.startsWith('{') ? 0.45 : 0,
    side: THREE.DoubleSide,
    toneMapped: false
  }));
  const modelGroups = data.models.map((model) => {
    const object = new THREE.Group();
    object.name = model.classname + '_' + model.index;
    object.position.fromArray(model.position);
    if (model.classname === 'func_door' || model.classname === 'func_door_rotating') object.visible = false;
    group.add(object);
    return object;
  });
  const floatArray = (base64) => {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  };
  const geometries = [];
  const fixtureMaterials=[];
  const district=createNightDistrict(data.name,group,{textures:ownedTextures,materials:fixtureMaterials,geometries});
  materials.forEach((material,index)=>district.dress(material,data.textures[index].name));
  let triangles = 0;
  for (let index = 0; index < data.meshes.length; index++) {
    const source = data.meshes[index];
    const geometry = new THREE.BufferGeometry();
    const positions = floatArray(source.p);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(floatArray(source.uv), 2));
    const lightUv = new THREE.BufferAttribute(floatArray(source.uv2), 2);
    geometry.setAttribute('uv1', lightUv);
    geometry.setAttribute('uv2', lightUv);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    triangles += positions.length / 9;
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials[source.texture]);
    mesh.userData.modelIndex = source.model;
    modelGroups[source.model].add(mesh);
    if (index % 64 === 63) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const rain=createDistrictRain(modelGroups,{geometries,materials:fixtureMaterials},data.name==='cs_assault');
  group.add(rain.mesh);
  const sky=district.sky;
  scene.background=sky;
  scene.fog=new THREE.FogExp2(data.name==='cs_assault'?0x31304a:0x2c4052,.000115);
  scene.add(group);

  const models = data.models.map((source) => ({...source, enabled: source.collide}));
  const entityByModel = new Map();
  for (const entity of data.entities) {
    if (entity.model && entity.model.startsWith('*')) entityByModel.set(Number(entity.model.slice(1)), entity);
  }
  const contentsAt = (head, point, hull) => {
    const nodes = hull === 0 ? data.nodes : data.clipnodes;
    let node = head;
    let guard = 0;
    while (node >= 0 && guard++ < 20000) {
      const entry = nodes[node];
      if (!entry) return -2;
      const plane = data.planes[entry[0]];
      const distance = plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] - plane[3];
      node = entry[distance >= 0 ? 1 : 2];
    }
    return node;
  };
  const modelContains = (model, point, hull) => {
    const local = [point[0] - model.position[0], point[1] - model.position[1], point[2] - model.position[2]];
    return contentsAt(model.heads[hull], local, hull);
  };
  const intersectsBounds = (model, a, b, hull) => {
    const bounds = model.bounds;
    if (!bounds) return true;
    const padding = hull === 1 ? [16, 36, 16] : hull === 3 ? [16, 18, 16] : [0, 0, 0];
    let near = 0;
    let far = 1;
    for (let axis = 0; axis < 3; axis++) {
      const low = bounds.min[axis] - padding[axis];
      const high = bounds.max[axis] + padding[axis];
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 0.00001) {
        if (a[axis] < low || a[axis] > high) return false;
      } else {
        const first = (low - a[axis]) / delta;
        const second = (high - a[axis]) / delta;
        near = Math.max(near, Math.min(first, second));
        far = Math.min(far, Math.max(first, second));
        if (near > far) return false;
      }
    }
    return true;
  };
  const traceModel = (model, start, end, hull) => {
    const offset = model.position;
    const p1 = start.map((value, axis) => value - offset[axis]);
    const p2 = end.map((value, axis) => value - offset[axis]);
    const nodes = hull === 0 ? data.nodes : data.clipnodes;
    const result = {fraction: 1, startSolid: false, allSolid: true, normal: [0, 1, 0], dist: 0};
    const recurse = (node, f1, f2, a, b, depth) => {
      if (depth > 256) return false;
      if (node < 0) {
        if (node !== -2) result.allSolid = false;
        else result.startSolid = true;
        return true;
      }
      const entry = nodes[node];
      const plane = data.planes[entry[0]];
      const t1 = a[0] * plane[0] + a[1] * plane[1] + a[2] * plane[2] - plane[3];
      const t2 = b[0] * plane[0] + b[1] * plane[1] + b[2] * plane[2] - plane[3];
      if (t1 >= 0 && t2 >= 0) return recurse(entry[1], f1, f2, a, b, depth + 1);
      if (t1 < 0 && t2 < 0) return recurse(entry[2], f1, f2, a, b, depth + 1);
      const side = t1 < 0 ? 1 : 0;
      let fraction = (t1 + (side ? 0.03125 : -0.03125)) / (t1 - t2);
      fraction = Math.max(0, Math.min(1, fraction));
      let middleFraction = f1 + (f2 - f1) * fraction;
      let middle = a.map((value, axis) => value + (b[axis] - value) * fraction);
      if (!recurse(entry[side + 1], f1, middleFraction, a, middle, depth + 1)) return false;
      if (contentsAt(entry[2 - side], middle, hull) !== -2) {
        return recurse(entry[2 - side], middleFraction, f2, middle, b, depth + 1);
      }
      if (result.allSolid) return false;
      result.normal = side ? plane.slice(0, 3).map((value) => -value) : plane.slice(0, 3);
      result.dist = side ? -plane[3] : plane[3];
      while (contentsAt(model.heads[hull], middle, hull) === -2) {
        fraction -= 0.1;
        if (fraction < 0) {
          result.fraction = middleFraction;
          return false;
        }
        middleFraction = f1 + (f2 - f1) * fraction;
        middle = a.map((value, axis) => value + (b[axis] - value) * fraction);
      }
      result.fraction = middleFraction;
      return false;
    };
    recurse(model.heads[hull], 0, 1, p1, p2, 0);
    return result;
  };
  const api = {
    name: data.name,
    group,
    modelGroups,
    entities: data.entities,
    floors: data.floors,
    navAreas: data.navAreas || [],
    models,
    triangles,
    pointContents(point, hull = 0) {
      const array = Array.isArray(point) ? point : [point.x, point.y, point.z];
      for (const model of models) {
        if (!model.enabled || !intersectsBounds(model, array, array, hull)) continue;
        const content = modelContains(model, array, hull);
        if (content === -2) return -2;
        if (model.index === 0 && content !== -1) return content;
      }
      return -1;
    },
    trace(start, end, hull = 1) {
      const a = Array.isArray(start) ? start : [start.x, start.y, start.z];
      const b = Array.isArray(end) ? end : [end.x, end.y, end.z];
      let best = {fraction: 1, startSolid: false, allSolid: false, normal: [0, 1, 0], dist: 0};
      let modelIndex = 0;
      let startSolid = false;
      for (const model of models) {
        if (!model.enabled || !intersectsBounds(model, a, b, hull)) continue;
        const current = traceModel(model, a, b, hull);
        startSolid = startSolid || current.startSolid;
        if (current.fraction < best.fraction || current.allSolid) {
          best = current;
          modelIndex = model.index;
          best.dist += best.normal[0] * model.position[0] + best.normal[1] * model.position[1] + best.normal[2] * model.position[2];
        }
      }
      const fraction = best.allSolid ? 0 : best.fraction;
      return {
        fraction,
        endPos: new THREE.Vector3(a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, a[2] + (b[2] - a[2]) * fraction),
        plane: {normal: new THREE.Vector3(...best.normal), dist: best.dist},
        startSolid,
        allSolid: best.allSolid,
        hit: fraction < 1,
        modelIndex
      };
    },
    setModelEnabled(index, enabled, visible = enabled) {
      if (models[index]) models[index].enabled = enabled;
      if (modelGroups[index]) modelGroups[index].visible = visible;
    },
    updateWeather(seconds) { rain.time.value=seconds; },
    setQuality(quality) {
      rain.mesh.visible=quality!=="low";
      const anisotropy = quality === 'high' ? 8 : quality === 'medium' ? 4 : 1;
      textures.forEach((texture) => {texture.anisotropy = anisotropy; texture.needsUpdate = true;});
    },
    dispose() {
      scene.remove(group);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      ownedTextures.forEach((texture) => texture.dispose());
      if (scene.background === sky) scene.background = null;
      fixtureMaterials.forEach(material=>material.dispose());
    }
  };
  return api;
}


;
/* Decode the embedded Studio animation and mesh streams. */
async function decodeStudioModels(data) {
  if (data.format !== 'goldsrc-studio-compact-1') return data;
  function typed(encoded, Type) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Type(bytes.buffer);
  }
  function scaled(encoded, Type, scale) {
    const source = typed(encoded, Type);
    const result = new Float32Array(source.length);
    for (let index = 0; index < source.length; index++) result[index] = source[index] / scale;
    return result;
  }
  const clips = [];
  for (let clipIndex = 0; clipIndex < data.clips.length; clipIndex++) {
    const clip = data.clips[clipIndex];
    const current = new Int32Array(typed(clip.base, Int16Array));
    const channels = typed(clip.channels, Uint16Array);
    const differences = typed(clip.delta, Int16Array);
    const samples = new Float32Array(clip.n * clip.stride);
    for (let frame = 0; frame < clip.n; frame++) {
      if (frame > 0) {
        const start = (frame - 1) * channels.length;
        for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
          const channel = channels[channelIndex];
          current[channel] = ((current[channel] + differences[start + channelIndex] + 32768) & 65535) - 32768;
        }
      }
      const outputOffset = frame * clip.stride;
      for (let channel = 0; channel < clip.stride; channel++) {
        const scale = channel % 7 < 3 ? data.positionScale : data.quaternionScale;
        samples[outputOffset + channel] = current[channel] / scale;
      }
      for (let boneOffset = 3; boneOffset < clip.stride; boneOffset += 7) {
        const at = outputOffset + boneOffset;
        const length = Math.hypot(samples[at], samples[at + 1], samples[at + 2], samples[at + 3]);
        if (length > 0) {
          samples[at] /= length;
          samples[at + 1] /= length;
          samples[at + 2] /= length;
          samples[at + 3] /= length;
        }
      }
    }
    clips.push({ n:clip.n, data:samples });
    if (clipIndex % 12 === 11) await new Promise(resolve => setTimeout(resolve, 0));
  }
  const models = {};
  for (const [key, source] of Object.entries(data.models)) {
    const normals = scaled(source.mesh.n, Int8Array, data.normalScale);
    for (let index = 0; index < normals.length; index += 3) {
      const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]);
      if (length > 0) {
        normals[index] /= length;
        normals[index + 1] /= length;
        normals[index + 2] /= length;
      }
    }
    const animations = {};
    for (const [name, reference] of Object.entries(source.animations)) {
      const clip = clips[reference.clip];
      animations[name] = { name:reference.name, duration:reference.duration, n:clip.n, data:clip.data };
    }
    models[key] = {
      bones:source.bones,
      textures:source.textures.map(reference => {
        const texture = data.textures[reference.texture];
        return {name:reference.name, flags:reference.flags, w:texture.w, h:texture.h, png:texture.image, format:texture.format};
      }),
      mesh:{ ...source.mesh, p:scaled(source.mesh.p, Int16Array, data.positionScale), n:normals, uv:scaled(source.mesh.uv, Uint16Array, data.uvScale) },
      animations
    };
  }
  return models;
}

/* GoldSrc Studio MDL mesh and animation runtime. Original asset conversion is in model-convert.py. */
// Saltline's PAC-9 enamel motifs, evaluated in the Studio mesh bind pose so paint
// moves with the slide and magazine through every existing animation.
// CS:2077的美术基调是赛博朋克：石墨工业表面、冷色霓虹、雨夜反光。
// The approved enamel patterns and environmental scans are embedded for offline use.
const paintCatalog={
  tide:{code:1,name:'海潮'},
  ceramic:{code:2,name:'白瓷'},
  ember:{code:3,name:'余烬'},
  factory:{code:0,name:'原厂'},
  dragon:{code:4,name:'青花游龙',tile:0},
  kintsugi:{code:5,name:'曜金裂隙',tile:1}
};
paintCatalog.ion={code:6,name:"离子光谱"};
paintCatalog.wasp={code:7,name:"黄蜂警戒"};
const paintOrder=['dragon','kintsugi','tide','ceramic','ember','factory'];
const gearPaintOrder=['ion','wasp',...paintOrder];
// Meshes here are cosmetic props attached to the original animated Studio knife hand.
const meleeNames={knife:'匕首',butterfly:'蝴蝶刀',karambit:'爪子刀'};
const isMelee=id=>Object.hasOwn(meleeNames,id);
let preferredMelee='knife';
const bladeTemplates=new Map();
function buildBladeTemplate(id){
  const root=new THREE.Group(),pivot=new THREE.Group(),free=new THREE.Group();
  pivot.name='blade';free.name='swingHandle';root.add(pivot,free);
  const metal=(color,paint=false)=>{
    const m=new THREE.MeshBasicMaterial({color,vertexColors:true,side:THREE.DoubleSide});
    m.userData.paintPanel=paint;return m;
  };
  const enamel=metal(0xa9b8bd,true),steel=metal(0xb6cad1),graphite=metal(0x394750),black=metal(0x202d37),cyan=metal(0x61ede0);
  function mesh(parent,geo,mat,x=0,y=0,z=0){
    const normals=geo.getAttribute('normal'),colors=[];
    for(let i=0;i<normals.count;i++){
      const light=.43+.50*Math.abs(normals.getZ(i))+.17*normals.getY(i)-.10*normals.getX(i);
      colors.push(light*.95,light,light*1.03);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const part=new THREE.Mesh(geo,mat);part.position.set(x,y,z);parent.add(part);return part;
  }
  function panel(parent,points,thickness,mat,z=0,vents=[]){
    const contour=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
    for(const [x,y,rx,ry] of vents){const hole=new THREE.Path();hole.absellipse(x,y,rx,ry,0,2*Math.PI,true);contour.holes.push(hole);}
    const bevel=Math.min(.05,thickness*.23);
    const geo=new THREE.ExtrudeGeometry(contour,{depth:thickness,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});
    geo.translate(0,0,-thickness/2);return mesh(parent,geo,mat,0,0,z);
  }
  function pin(parent,x,y,r,z){
    for(const side of [-1,1]){
      const cap=new THREE.CylinderGeometry(r,r,.05,16).rotateX(Math.PI/2);
      mesh(parent,cap,steel,x,y,side*z);
      mesh(parent,new THREE.BoxGeometry(r*.98,.045,.02),black,x,y,side*(z+.033)).rotation.z=.48;
    }
  }
  if(id==='butterfly'){
    for(const [parent,side] of [[root,-1],[free,1]]){
      const x=.40*side;
      const grip=[[-.31,.30],[.29,.25],[.38,-1.15],[.22,-3.7],[.30,-5.25],[.13,-5.6],[-.28,-5.49],[-.38,-4.0],[-.28,-2.05]].map(([a,b])=>[x+side*a,b]);
      const vents=[-1.2,-2.22,-3.3,-4.43].map(y=>[x,y,.13,.30]);
      for(const face of [-1,1])panel(parent,grip,.11,enamel,face*.20,vents);
      for(const y of [-.45,-2.81,-5.21])mesh(parent,new THREE.BoxGeometry(.46,.14,.40),graphite,x,y,0);
      for(const y of [0,-5.21])pin(parent,x,y,.21,.29);
      for(const face of [-1,1])mesh(parent,new THREE.BoxGeometry(.25,.12,.022),cyan,x,-4.96,face*.27);
    }
    for(const side of [-1,1])mesh(root,new THREE.BoxGeometry(.17,3.38,.035),graphite,-.60,-2.84,side*.292);
    const profile=[[-.56,-.30],[.61,-.26],[.82,.74],[.63,2.96],[.49,4.74],[-.79,7.54],[-.58,5.02],[-.70,3.48],[-.87,1.51]];
    panel(pivot,profile,.22,enamel);
    for(const side of [-1,1]){
      panel(pivot,[[-.79,7.54],[.49,4.74],[.63,2.96],[.82,.74],[.58,.61],[.32,2.9],[.17,4.65]],.021,steel,side*.178);
      panel(pivot,[[-.40,.62],[-.23,2.85],[-.26,4.42],[-.44,3.53],[-.60,.88]],.017,graphite,side*.178);
    }
    // Free arm and blade share the near hinge, with independent angular tracks.
    for(const part of free.children)part.position.x-=.40;
    free.position.x=.40;
  }else{
    const grip=[[-.65,.47],[.48,.36],[.76,-.55],[.44,-1.28],[.62,-1.78],[.27,-2.4],[.39,-2.96],[-.02,-3.47],[.04,-4.50],[-.62,-4.79],[-1.13,-4.30],[-1.28,-3.25],[-1.13,-1.82]];
    panel(root,grip,.49,graphite);
    for(const side of [-1,1]){
      panel(root,[[-.51,-.05],[.28,-.2],[.32,-.88],[-.12,-1.64],[-.21,-2.7],[-.58,-4.10],[-.88,-3.95],[-.94,-2.28]],.065,enamel,side*.28);
      for(const y of [-1.0,-1.65,-2.3])mesh(root,new THREE.BoxGeometry(.56,.09,.028),black,-.40,y,side*.33).rotation.z=.40;
    }
    pin(root,-.30,-.57,.16,.34);pin(root,-.62,-3.76,.14,.34);
    mesh(root,new THREE.TorusGeometry(1.02,.23,10,40),steel,-.62,-5.06,0);
    const claw=new THREE.Shape();claw.moveTo(-.65,.15);claw.bezierCurveTo(-1.25,2.3,-2.77,4.48,-4.7,5.56);
    claw.bezierCurveTo(-3.18,5.43,-.65,4.35,.45,2.42);claw.quadraticCurveTo(1.05,1.48,1.03,.83);claw.lineTo(.50,.17);claw.closePath();
    panel(pivot,claw.getPoints(18).map(v=>[v.x,v.y]),.21,enamel);
    for(const side of [-1,1]){
      const edge=new THREE.Shape();edge.moveTo(-.65,.16);edge.bezierCurveTo(-1.25,2.3,-2.77,4.48,-4.7,5.56);edge.bezierCurveTo(-2.82,4.72,-.89,2.45,-.34,.54);edge.closePath();
      panel(pivot,edge.getPoints(18).map(v=>[v.x,v.y]),.016,steel,side*.171);
    }
  }
  return root;
}
function attachBlade(studio,key,id){
  if(!bladeTemplates.has(id))bladeTemplates.set(id,buildBladeTemplate(id));
  const rig=bladeTemplates.get(id).clone(true),view=key==='knife',dropped=key==='w_knife';
  const nativeBone=studio.bones.find(b=>b.name===(view?'Bone25':'skin01'));
  const x=view?new THREE.Vector3(1,0,0):new THREE.Vector3(0,dropped?0:.43,dropped?1:.90).normalize();
  const y=new THREE.Vector3(0,view?-.995:dropped?-1:-.90,view?-.10:dropped?0:.43).normalize();
  const placement=new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y));
  placement.setPosition(...(view?[0,-19.18,-7.3]:dropped?[-13.4,-4.25,44.6]:[-6.12,-14,38.1]));
  placement.premultiply(nativeBone.matrixWorld.clone().invert());
  placement.decompose(rig.position,rig.quaternion,rig.scale);rig.scale.multiplyScalar(view?(id==='karambit'?.83:.90):dropped?1.45:1.18);
  nativeBone.add(rig);
  const panels=[];rig.traverse(o=>{if(o.isMesh&&o.material.userData.paintPanel)panels.push([o,o.material]);});
  const pivot=rig.getObjectByName('blade'),swing=rig.getObjectByName('swingHandle'),rest=rig.quaternion.clone();
  const rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1);
  const restPosition=rig.position.clone(),ring=new THREE.Vector3(-.62,-5.06,0),anchor=new THREE.Vector3(),offset=new THREE.Vector3();
  function setFinish(finish){
    for(const [o,base] of panels){
      const variants=base.userData.variants||(base.userData.variants=new Map());
      const key=knownFinish(finish)?finish:'default';
      if(!variants.has(key)){
        const m=new THREE.MeshBasicMaterial({color:base.color,vertexColors:true,side:THREE.DoubleSide});
        applyStudioFinish(m,id,'blade-enamel',key==='default'?gunFinish:{value:paintCatalog[key].code});variants.set(key,m);
      }
      o.material=variants.get(key);
    }
  }
  function pose(t){
    t=Math.max(0,Math.min(1,t));
    if(id==='butterfly'){
      const smooth=q=>q*q*(3-2*q);
      const blade=smooth(Math.min(1,t/.65)),handle=smooth(Math.max(0,(t-.11)/.89));
      pivot.rotation.z=3.04*(1-blade)-.43*Math.sin(Math.PI*t*2)*(1-t);
      swing.rotation.z=Math.PI*2*handle+.36*Math.sin(3*Math.PI*t)*(1-t);
      rig.quaternion.copy(rest).multiply(rotation.setFromAxisAngle(axis,-.48*Math.sin(2*Math.PI*t)*(1-t)));
    }else{
      const turn=t*t*(3-2*t);
      rig.quaternion.copy(rest).multiply(rotation.setFromAxisAngle(axis,2*Math.PI*turn));
      // Keep the ring by the fingers through the spin, then settle into the original grip.
      anchor.copy(ring);anchor.y+=2.55*Math.sin(Math.PI*t);
      anchor.multiply(rig.scale).applyQuaternion(rest);
      offset.copy(ring).multiply(rig.scale).applyQuaternion(rig.quaternion);
      rig.position.copy(restPosition).add(anchor).sub(offset);
    }
  }
  pose(1);return {rig,setFinish,pose};
}
const paintWeapons=new Set(['ak47','m4a1','awp','usp','glock','deagle',...Object.keys(meleeNames),'he']);
const gunFinish={value:1};
let defaultFinish='tide';
const finishPreferences=Object.create(null);
let paintAtlas, gearAtlas, terrainTiles;
const knownFinish=id=>Object.hasOwn(paintCatalog,id);
function ownedOrPreferredFinish(id){
  const item=G.player?.inventory[WEAPONS[id]?.slot];
  return (item?.id===id&&item.finish)||finishPreferences[id]||defaultFinish;
}
function rememberFinish(id,finish){
  if(!knownFinish(finish))return;
  finishPreferences[id]=finish;
  try{localStorage.setItem('future-era.finishes',JSON.stringify(finishPreferences));}catch{}
}
function setupFinishControl(){
  try{
    const saved=localStorage.getItem('cs16.night.finish');
    if(paintOrder.includes(saved))defaultFinish=saved;
    const melee=localStorage.getItem('future-era.melee');
    if(isMelee(melee))preferredMelee=melee;
    const prefs=JSON.parse(localStorage.getItem('future-era.finishes')||'{}');
    for(const [id,value] of Object.entries(prefs))if(paintWeapons.has(id)&&knownFinish(value))finishPreferences[id]=value;
  }catch{}
  gunFinish.value=paintCatalog[defaultFinish].code;
  const holder=document.querySelector('.finishChoices');
  holder.innerHTML=paintOrder.map(id=>'<label><input type="radio" name="gunFinish" value="'+id+'"><span><i class="paintChip chip-'+id+'"></i>'+paintCatalog[id].name+'</span></label>').join('');
  for(const input of holder.querySelectorAll('input')){
    input.checked=input.value===defaultFinish;
    input.onchange=()=>{
      if(!input.checked)return;
      defaultFinish=input.value;gunFinish.value=paintCatalog[defaultFinish].code;
      try{localStorage.setItem('cs16.night.finish',defaultFinish);}catch{}
    };
  }
}
async function loadEditionTextures(){
  const loader=new THREE.TextureLoader();
  const [paint,scans,gear]=await Promise.all([loader.loadAsync(EDITION_PAINT_IMAGE),loader.loadAsync(EDITION_GROUND_IMAGE),loader.loadAsync(GEAR_PAINT_IMAGE)]);
  gear.flipY=false;gear.colorSpace=THREE.SRGBColorSpace;gear.anisotropy=8;gearAtlas=gear;
  paint.flipY=false;paint.colorSpace=THREE.SRGBColorSpace;paint.anisotropy=8;paintAtlas=paint;
  const src=scans.image,w=src.width/2,h=src.height/2;
  terrainTiles=['slate','gravel','concrete','asphalt'].map((name,index)=>{
    const ctx=nightCanvas(640,640);
    ctx.drawImage(src,(index%2)*w+2,Math.floor(index/2)*h+2,w-4,h-4,0,0,640,640);
    const albedo=nightTexture(ctx),size=ctx.canvas.width,pixels=ctx.getImageData(0,0,size,size).data;
    const height=new Float32Array(size*size),slope=new Uint8Array(size*size*4);
    for(let i=0;i<height.length;i++)height[i]=(pixels[i*4]*.30+pixels[i*4+1]*.57+pixels[i*4+2]*.13)/255;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=y*size+x;
      const dx=height[y*size+Math.max(0,x-1)]-height[y*size+Math.min(size-1,x+1)];
      const dy=height[Math.max(0,y-1)*size+x]-height[Math.min(size-1,y+1)*size+x];
      slope[i*4]=Math.round(128+Math.max(-1,Math.min(1,dx*1.8))*126);
      slope[i*4+1]=Math.round(128+Math.max(-1,Math.min(1,dy*1.8))*126);
      slope[i*4+2]=Math.round(height[i]*255);slope[i*4+3]=255;
    }
    const relief=new THREE.DataTexture(slope,size,size);relief.generateMipmaps=true;relief.minFilter=THREE.LinearMipmapLinearFilter;relief.magFilter=THREE.LinearFilter;
    for(const t of [albedo,relief]){t.flipY=false;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.anisotropy=8;t.needsUpdate=true;}
    return {name,albedo,relief};
  });
  scans.dispose();
  document.documentElement.style.setProperty('--gear-atlas','url("'+GEAR_PAINT_IMAGE+'")');
  document.documentElement.style.setProperty('--paint-atlas','url("'+EDITION_PAINT_IMAGE+'")');
}
const GEAR_PAINT_IMAGE='./assets/gear-paint.jpg';
const EDITION_PAINT_IMAGE='./assets/gun-paint.jpg';
const EDITION_GROUND_IMAGE='./assets/ground.jpg';

function applyStudioFinish(material,key,textureName,finishUniform=gunFinish) {
  const gun=key.replace(/^[pw]_/,'');
  if(!paintWeapons.has(gun) || (gun==='he'&&!/body/i.test(textureName)) ||
     /^(?:view_|reticle)|scope_clamps|bolt_handle|ejector_port/i.test(textureName))return;
  material.userData.enamel=true;
  const firstPerson=key===gun;
  const trim=/barrel|silencer|scope|magazine|handle|glock_mag/i.test(textureName);
  material.onBeforeCompile=shader=>{
    shader.uniforms.uFinish=finishUniform;
    shader.uniforms.uPaintAtlas={value:paintAtlas};
    shader.uniforms.uGearAtlas={value:gearAtlas};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 paintP; varying vec3 paintN;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      paintP=${gun==='butterfly'||gun==='karambit'?'vec3(position.z,position.x,position.y)':firstPerson?'vec3(position.x,position.z,-position.y)':'vec3(position.y,position.z,position.x)'}*.026;
      paintN=normal;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 paintP; varying vec3 paintN; uniform float uFinish; uniform sampler2D uPaintAtlas,uGearAtlas;
      float enamelHash(vec3 p){return fract(sin(mod(dot(p,vec3(13.7,37.1,83.3)),217.))*17239.53);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      if(uFinish>.5){
        vec3 p=paintP;
        float diagonal=fract(p.z*11.+p.y*15.+p.x*2.);
        vec3 enamel;
        if(uFinish<1.5){
          float waves=fract(p.z*10.5+p.y*8.+.23*sin(p.y*57.+p.x*14.));
          enamel=mix(vec3(.018,.086,.108),vec3(.036,.53,.46),smoothstep(.28,.32,waves));
          enamel=mix(enamel,vec3(.62,.83,.71),smoothstep(.78,.80,waves)*(1.-smoothstep(.85,.87,waves)));
        }else if(uFinish<2.5){
          enamel=mix(vec3(.72,.70,.78),vec3(.18,.11,.25),smoothstep(.65,.67,diagonal));
          enamel=mix(enamel,vec3(.60,.24,.65),step(.86,diagonal)*step(diagonal,.92));
        }else if(uFinish<3.5){
          float tile=fract(floor(p.y*160.)*.17+floor(p.z*125.)*.037+floor(p.x*160.)*.25);
          enamel=mix(vec3(.14,.066,.043),vec3(.73,.19,.035),step(.28,tile));
          enamel=mix(enamel,vec3(.95,.57,.20),step(.78,tile));
        }
        if(uFinish>3.5){
          // Mirror the engraving at tile edges. Positions are in the bone bind pose.
          vec2 design=vec2(p.z,${key.startsWith('w_')?'p.x+p.y*.23':'p.y+p.x*.23'})*${gun==='he'?(firstPerson?'12.0':'6.4'):isMelee(gun)?(gun==='knife'?'4.7':'5.6'):(['usp','glock','deagle'].includes(gun)?'6.4':'3.95')}+vec2(.31,.57);
          vec2 repeatUV=1.-abs(mod(design,2.)-1.);
          vec2 uv=(vec2(uFinish-4.,0.)+mix(vec2(.006),vec2(.994),repeatUV))*vec2(.5,1.);
          if(uFinish<5.5)enamel=texture2D(uPaintAtlas,uv).rgb;
          else{
            vec2 gearUV=(vec2(uFinish-6.,0.)+mix(vec2(.006),vec2(.994),repeatUV))*vec2(1./2.,1.);
            enamel=texture2D(uGearAtlas,gearUV).rgb;
          }
        }
        float luma=dot(diffuseColor.rgb,vec3(.3,.5,.2));
        float relief=.20+.80*smoothstep(.035,.64,sqrt(luma));
        float rim=abs(dot(normalize(paintN),normalize(vec3(.22,.42,.88))));
        float wear=smoothstep(.90,.99,enamelHash(floor(p*490.)))*smoothstep(.11,.34,luma);
        vec3 coat=enamel*relief*(.65+.34*rim)+vec3(.015,.024,.029)*rim;
        ${trim?'coat=mix(diffuseColor.rgb*vec3(.71,.82,.90),coat,.29);':''}
        diffuseColor.rgb=mix(coat,diffuseColor.rgb,wear*.70);
      }`);
  };
  material.customProgramCacheKey=()=> 'studio-enamel-'+(firstPerson?'view':'world')+(trim?'-trim':'')+'-'+gun+'-'+key.split('_')[0];
}

async function loadModels(THREE, modelData) {
  modelData = await decodeStudioModels(modelData);
  const assets = new Map();
  const byteArrays = (encoded, Type) => {
    if (encoded instanceof Type) return encoded;
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Type(bytes.buffer);
  };
  const textureCache = new Map();
  async function textureFor(source) {
    if (textureCache.has(source.png)) return textureCache.get(source.png);
    const pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.needsUpdate = true;
        resolve(texture);
      };
      image.onerror = reject;
      image.src = 'data:image/' + (source.format || 'png') + ';base64,' + source.png;
    });
    textureCache.set(source.png, pending);
    return pending;
  }
  for (const [key, source] of Object.entries(modelData)) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(byteArrays(source.mesh.p, Float32Array), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(byteArrays(source.mesh.n, Float32Array), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(byteArrays(source.mesh.uv, Float32Array), 2));
    const boneIndices = byteArrays(source.mesh.bone, Uint16Array);
    const skinIndices = new Uint16Array(boneIndices.length * 4);
    const skinWeights = new Float32Array(boneIndices.length * 4);
    for (let index = 0; index < boneIndices.length; index++) {
      skinIndices[index * 4] = boneIndices[index];
      skinWeights[index * 4] = 1;
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
    geometry.setIndex(new THREE.BufferAttribute(byteArrays(source.mesh.index, Uint16Array), 1));
    for (const [start, count, material] of source.mesh.groups) geometry.addGroup(start, count, material);
    const textures = await Promise.all(source.textures.map(textureFor));
    const materials = textures.map((texture, index) => new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      alphaTest: source.textures[index].flags & 64 ? .5 : 0
    }));
    const viewMaterials = textures.map((texture, index) => new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      alphaTest: source.textures[index].flags & 64 ? .5 : 0,
      toneMapped: false
    }));
    for (let i=0;i<textures.length;i++){
      applyStudioFinish(materials[i],key,source.textures[i].name);
      applyStudioFinish(viewMaterials[i],key,source.textures[i].name);
    }
    const animations = {};
    for (const [name, animation] of Object.entries(source.animations)) {
      animations[name] = { ...animation, samples: byteArrays(animation.data, Float32Array) };
    }
    assets.set(key, { source, geometry, materials, viewMaterials, animations });
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const sampleQuaternion = new THREE.Quaternion();
  const hiddenBlade=new THREE.MeshBasicMaterial({visible:false});
  function instantiate(key, view = false, finish, style) {
    const asset = assets.get(key);
    const native = new THREE.Group();
    const bones = asset.source.bones.map(source => {
      const bone = new THREE.Bone();
      bone.name = source.name;
      bone.position.fromArray(source.p);
      bone.quaternion.fromArray(source.q);
      return bone;
    });
    asset.source.bones.forEach((source, index) => {
      if (source.parent >= 0) bones[source.parent].add(bones[index]);
      else native.add(bones[index]);
    });
    const baseMaterials=view?asset.viewMaterials:asset.materials;
    function materialsForFinish(id){
      if(!knownFinish(id))return baseMaterials;
      const variants=asset.finishVariants||(asset.finishVariants=new Map());
      const name=(view?'view/':'world/')+id;
      if(!variants.has(name)){
        const uniform={value:paintCatalog[id].code};
        variants.set(name,baseMaterials.map((base,index)=>{
          if(!base.userData.enamel)return base;
          const material=base.clone();applyStudioFinish(material,key,asset.source.textures[index].name,uniform);return material;
        }));
      }
      return variants.get(name);
    }
    const mesh = new THREE.SkinnedMesh(asset.geometry,materialsForFinish(finish));
    native.add(mesh);
    native.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    mesh.bind(skeleton);
    mesh.frustumCulled = false;
    const root = new THREE.Group();
    root.add(native);
    const blade=style&&style!=='knife'&&isMelee(style)?attachBlade({bones},key,style):null;
    root.userData.blade=blade;
    root.setFinish=id=>{
      root.userData.finish=id;
      const materials=materialsForFinish(id);
      mesh.material=blade?materials.map((m,i)=>/^view_/i.test(asset.source.textures[i].name)?m:hiddenBlade):materials;
      blade?.setFinish(id);
    };
    root.setFinish(finish);
    let action = 'idle';
    let idleAction = 'idle';
    let elapsed = 0;
    let finished = true;
    function play(name, restart = true) {
      if (!asset.animations[name]) return;
      if (restart || action !== name) elapsed = 0;
      action = name;
      finished = false;
    }
    function animate(dt, loop = true, hold = false) {
      elapsed += dt;
      let clip = asset.animations[action] || asset.animations[idleAction];
      if (hold) elapsed = Math.min(elapsed, clip.duration);
      if (!loop && !hold && elapsed >= clip.duration) {
        finished = true;
        action = idleAction;
        elapsed = 0;
        clip = asset.animations[idleAction];
      }
      const frame = (loop ? elapsed % clip.duration : Math.min(elapsed, clip.duration)) / clip.duration * (clip.n - 1);
      const first = Math.floor(frame);
      const second = Math.min(first + 1, clip.n - 1);
      const alpha = frame - first;
      const stride = bones.length * 7;
      for (let index = 0; index < bones.length; index++) {
        const a = first * stride + index * 7;
        const b = second * stride + index * 7;
        const data = clip.samples;
        bones[index].position.set(
          THREE.MathUtils.lerp(data[a], data[b], alpha),
          THREE.MathUtils.lerp(data[a + 1], data[b + 1], alpha),
          THREE.MathUtils.lerp(data[a + 2], data[b + 2], alpha)
        );
        bones[index].quaternion.fromArray(data, a + 3);
        sampleQuaternion.fromArray(data, b + 3);
        bones[index].quaternion.slerp(sampleQuaternion, alpha);
      }
    }
    root.play = play;
    root.setIdleAction = name => {idleAction = asset.animations[name] ? name : 'idle';};
    root.update = dt => animate(dt, action === idleAction);
    root.dispose = () => skeleton.dispose();
    root.userData.studio = { native, bones, skeleton, animate, play, asset, get action() { return action; }, get finished() { return finished; } };
    animate(0);
    return root;
  }
  function createViewWeapon(id,finish) {
    const root = instantiate(isMelee(id)?'knife':id,true,finish,id);
    const native = root.userData.studio.native;
    // The original right-handed GoldSrc view model uses +X forward and +Y screen-right.
    const handedness = isMelee(id) ? -1 : 1;
    native.matrix.set(0, handedness, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 1);
    native.matrixAutoUpdate = false;
    let time=0,drawTime=Infinity;
    const drawDuration=id==='butterfly'?.64:id==='karambit'?.52:.29;
    const update = root.update;
    const play = root.play;
    let silenced = true;
    let readyPose=0;
    if(id==='he'){
      root.primeGrenade=()=>{readyPose=0;root.play('idle');};
      root.releaseGrenade=()=>{
        // Continue the arm swing with empty hands after the projectile leaves.
        const studio=root.userData.studio,mesh=native.children.find(part=>part.isSkinnedMesh);
        mesh.material=mesh.material.map((material,i)=>/^view_/i.test(studio.asset.source.textures[i].name)?material:hiddenBlade);
        root.play('fire');studio.animate(.38,false);
      };
    }
    root.play = (action, restart = true) => {
      drawTime=action==='draw'?0:Infinity;
      root.userData.blade?.pose(action==='draw'?0:1);
      const alternate = action + '_unsil';
      play(!silenced && root.userData.studio.asset.animations[alternate] ? alternate : action, restart);
    };
    root.setSilenced = (value, animate = true) => {
      const asset = root.userData.studio.asset;
      if (!asset.animations.idle_unsil) return 0;
      const next = Boolean(value);
      const changed = next !== silenced;
      silenced = next;
      root.setIdleAction(silenced ? 'idle' : 'idle_unsil');
      const transition = silenced ? 'attach' : 'detach';
      if (changed && animate) {
        play(transition);
        return asset.animations[transition].duration;
      }
      root.play('idle');
      return 0;
    };
    root.update = (dt, options = {}) => {
      time += dt;
      update(dt);
      const movement = Math.min(1, Number(options.move || options.moving || 0));
      root.position.x = Math.sin(time * 9) * movement * .15;
      root.position.y = Math.cos(time * 18) * movement * .13;
      const previous=drawTime;drawTime+=dt;
      const t=Math.min(1,drawTime/drawDuration),ease=1-t,sway=Math.sin(Math.PI*t);
      const blade=root.userData.blade;
      blade?.pose(t);
      root.position.y-=ease*ease*(blade?1.8:.8);
      root.position.x+=ease*(blade ? 1.35 : .52);
      root.rotation.z=Math.sin(time*9)*movement*.004+ease*(blade ? .16 : .075)-sway*(id==='karambit'?.20:.055);
      if(id==='he'){
        readyPose=THREE.MathUtils.damp(readyPose,options.priming?1:0,12,dt);
        root.position.x+=.65*readyPose;root.position.y+=.55*readyPose;
        root.rotation.z-=.075*readyPose;
      }
      if(options.audible&&id==='butterfly'){
        for(const beat of [.17,.50])if(previous<beat&&drawTime>=beat)shortTone(beat<.3?1460:1780,480,0,.035,.044,'triangle');
      }
    };
    root.play('draw');
    return root;
  }
  function createActor(team, hostage = false) {
    const key = hostage ? 'hostage' : String(team).toLowerCase() === 'ct' ? 'ct' : 't';
    const root = instantiate(key);
    const studio = root.userData.studio;
    studio.native.rotation.x = -Math.PI / 2;
    // GoldSrc player models have their entity origin at the centre of their hull.
    studio.native.position.y = hostage ? 0 : 36;
    root.userData.forwardAxis = '+X';
    let weapon = null;
    let weaponBoneMap = null;
    let weaponId = null;
    const actorByName = new Map(studio.bones.map(bone => [bone.name, bone]));
    function setWeapon(id,finish) {
      if(hostage)return;
      if(id===weaponId){
        if(weapon&&weapon.userData.finish!==finish)weapon.setFinish(finish);
        return;
      }
      const assetKey = 'p_' + (isMelee(id)?'knife':id);
      if (!assets.has(assetKey)) return;
      if (weapon) {
        studio.native.remove(weapon);
        weapon.dispose();
      }
      weaponId = id;
      weapon = instantiate(assetKey,false,finish,id);
      studio.native.add(weapon);
      weaponBoneMap = weapon.userData.studio.bones.map(bone => actorByName.get(bone.name));
    }
    if (!hostage) {
      setWeapon(key === 'ct' ? 'm4a1' : 'ak47');
    }
    let previousFire = false;
    let dead = false;
    function actionFor(base) {
      const category=isMelee(weaponId)?'knife':['usp','deagle','glock'].includes(weaponId)?'pistol':weaponId;
      const candidate = base + '_' + category;
      return studio.asset.animations[candidate] ? candidate : base;
    }
    const isLocomotion = action => ['idle', 'run', 'walk', 'crouch'].includes(action.split('_')[0]);
    const ownDispose = root.dispose;
    root.dispose = () => {
      ownDispose();
      if (weapon) weapon.dispose();
    };
    root.update = (dt, options = {}) => {
      if(options.weaponId)setWeapon(options.weaponId,options.finish);
      studio.native.position.y = hostage ? 0 : options.crouch ? 18 : 36;
      if (options.dead) {
        if (!dead) root.play('death');
        dead = true;
        studio.animate(Math.min(dt, .05), false, true);
      } else {
        const moving = options.moving || options.move || options.speed > 1;
        const next = actionFor(options.crouch ? 'crouch' : moving ? 'run' : 'idle');
        const reloadAction = actionFor('reload');
        if (options.fire && !previousFire) root.play(actionFor('fire'));
        if (options.reloading && studio.action !== reloadAction) root.play(reloadAction);
        if (isLocomotion(studio.action) || studio.finished) studio.play(next, false);
        studio.animate(dt, isLocomotion(studio.action));
      }
      previousFire = Boolean(options.fire);
      if (weapon) {
        const weaponBones = weapon.userData.studio.bones;
        for (let index = 0; index < weaponBones.length; index++) {
          const actorBone = weaponBoneMap[index];
          if (!actorBone) continue;
          weaponBones[index].position.copy(actorBone.position);
          weaponBones[index].quaternion.copy(actorBone.quaternion);
        }
      }
    };
    root.update(0);
    root.setWeapon = setWeapon;
    return root;
  }
  function createWorldWeapon(id,finish) {
    const key=isMelee(id)?'w_knife':assets.has('w_'+id)?'w_'+id:'w_ak47';
    const root = instantiate(key,false,finish,id);
    root.userData.studio.native.rotation.x = -Math.PI / 2;
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    root.userData.studio.native.position.y -= bounds.min.y;
    root.updateMatrixWorld(true);
    return root;
  }
  return { createViewWeapon, createWorldWeapon, createActor, assets };
}

;
/* Original CS 1.6 640hud7.spr numeric glyphs and icons, decoded at build time. */
let goldHudAsset = null;
async function loadGoldHud(data) {
  const image = await new Promise((resolve, reject) => {
    const sprite = new Image();
    sprite.onload = () => resolve(sprite);
    sprite.onerror = reject;
    sprite.src = 'data:image/png;base64,' + data.image;
  });
  const tinted = {};
  for (const [name, color] of Object.entries({gold:'#e6e9dc', red:'#ff655e', green:'#9fddc9'})) {
    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    tinted[name] = canvas;
  }
  goldHudAsset = { rects:data.rects, tinted };
  return { draw:drawGoldHud };
}
function drawGoldHud(canvas, state) {
  if (!goldHudAsset) return;
  const width = state.width || canvas.clientWidth || innerWidth;
  const height = state.height || canvas.clientHeight || innerHeight;
  const dpr=state.dpr||Math.min(devicePixelRatio||1,2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const scale = state.scale || Math.max(.57, Math.min(1.5, width / 1220));
  const gap = 7 * scale;
  const margin = 16 * scale;
  const bottom = height - 13 * scale;
  const top = bottom - 25 * scale;
  const digitWidth = 17 * scale;
  context.imageSmoothingEnabled = true;
  context.globalAlpha=1;
  function icon(name, x, y, color = 'gold', targetHeight = null) {
    const rect = goldHudAsset.rects[name];
    if (!rect) return 0;
    const [sx, sy, sw, sh] = rect;
    const drawHeight = targetHeight || sh * scale;
    const drawWidth = sw * scale;
    context.drawImage(goldHudAsset.tinted[color], sx, sy, sw, sh, x, y, drawWidth, drawHeight);
    return drawWidth;
  }
  function digits(value, x, y, color = 'gold') {
    const text=typeof value==='string'?value:String(Math.max(0,Math.floor(Number(value)||0)));
    context.font='700 '+(28*scale)+'px Bahnschrift,Consolas,monospace';
    context.textBaseline='middle';context.fillStyle=color==='red'?'#ff655e':'#f1f1e5';
    for(const c of text){context.fillText(c,x,y+13*scale);x+=digitWidth;}
    return x;
  }
  function instrument(x,y,w,h,edge){
    context.fillStyle='rgba(15,25,26,.85)';
    context.fillRect(x,y,w,h);context.fillStyle=edge;context.fillRect(x,y,2*scale,h);
  }
  function numberWidth(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).length * digitWidth;
  }
  const healthColor = Number(state.health) <= 25 ? 'red' : 'gold';
  instrument(margin-6*scale,top-4*scale,207*scale,35*scale,Number(state.health)<=25?'#ff655e':'#8bc6b5');
  icon('cross',margin,top,healthColor);
  digits(state.health, margin + 24 * scale + gap, top, healthColor);
  const armorX = margin + 109 * scale;
  icon(state.helmet ? 'suithelmet_empty' : 'suit_empty', armorX, top);
  if (Number(state.armor) > 0) {
    // GoldSrc fills the same armour silhouette according to its remaining charge.
    const rect = goldHudAsset.rects[state.helmet ? 'suithelmet_full' : 'suit_full'];
    const fill = Math.min(1, Number(state.armor) / 100);
    context.drawImage(goldHudAsset.tinted.gold, rect[0], rect[1] + rect[3] * (1 - fill), rect[2], rect[3] * fill,
      armorX, top + rect[3] * scale * (1 - fill), rect[2] * scale, rect[3] * scale * fill);
  }
  digits(state.armor, armorX + 24 * scale + gap, top);
  const seconds = Math.max(0, Math.ceil(Number(state.time) || 0));
  const minuteText = String(Math.floor(seconds / 60));
  const secondText = String(seconds % 60).padStart(2, '0');
  const colonWidth = 6 * scale;
  const timerWidth = (minuteText.length + 2) * digitWidth + colonWidth + 24 * scale + gap;
  let timerX = width / 2 - timerWidth / 2;
  const timerColor = state.planted || seconds < 15 ? 'red' : 'gold';
  instrument(timerX-6*scale,top-4*scale,timerWidth+12*scale,35*scale,timerColor==='red'?'#ff655e':'#879a8a');
  timerX += icon('stopwatch', timerX, top, timerColor) + gap;
  timerX = digits(Number(minuteText), timerX, top, timerColor);
  context.fillStyle=timerColor==='red'?'#ff655e':'#e1e4d4';
  context.fillRect(timerX + scale, top + 8 * scale, 2 * scale, 3 * scale);
  context.fillRect(timerX + scale, top + 16 * scale, 2 * scale, 3 * scale);
  timerX += colonWidth;
  digits(secondText,timerX,top,timerColor);
  const moneyWidth = numberWidth(state.money) + 18 * scale + gap;
  let moneyX = width - margin - moneyWidth;
  const moneyY=top-43*scale;
  instrument(moneyX-6*scale,moneyY-4*scale,moneyWidth+12*scale,35*scale,'#907c50');
  moneyX += icon('dollar', moneyX, moneyY) + gap;
  digits(state.money, moneyX, moneyY);
  if (state.ammo !== null && state.ammo !== undefined && !['knife','c4'].includes(state.weapon)) {
    const ammunitionIcon = 'ammo_' + (state.weapon || 'ak47');
    const ammoWidth = numberWidth(state.ammo) + numberWidth(state.reserve) + 24 * scale + 2 * scale + 3 * gap;
    let ammoX=width-margin-ammoWidth;
    instrument(ammoX-6*scale,top-4*scale,ammoWidth+12*scale,35*scale,'#ebd66b');
    ammoX = digits(state.ammo, ammoX, top);
    ammoX += gap;
    ammoX += icon('divider', ammoX, top, 'gold', 25 * scale) + gap;
    ammoX = digits(state.reserve, ammoX, top) + gap;
    icon(ammunitionIcon, ammoX, top);
  }
  let statusY = top - 44 * scale;
  if (state.kit) {
    icon('defuser', margin, statusY, 'green');
    statusY -= 36 * scale;
  }
  if (state.c4) {
    icon('c4', margin, statusY, state.planted ? 'red' : 'gold');
    statusY -= 36 * scale;
  }
  if (state.buyzone) icon('buyzone', margin, statusY, 'green');
  context.globalAlpha = 1;
}

;

;

;

;

;

;
/* Offline Counter-Strike study. Runtime and game rules are independent of GoldSrc. */
'use strict';
performance.mark('game-script');
const $ = id => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;
const sleepFrame = () => new Promise(resolve => setTimeout(resolve, 0));
const WEAPONS = {
  ak47: {name:'AK-47', slot:1, clip:30, reserve:90, damage:36, interval:.0955, reload:2.45, cost:2500, speed:221, recoil:.015, spread:.005, sound:'ak47-1', auto:true},
  m4a1: {name:'M4A1', slot:1, clip:30, reserve:90, damage:33, interval:.0875, reload:3.05, cost:3100, speed:230, recoil:.012, spread:.004, sound:'m4a1-1', auto:true},
  awp: {name:'AWP', slot:1, clip:10, reserve:30, damage:115, interval:1.45, reload:2.5, cost:4750, speed:210, recoil:.034, spread:.001, sound:'awp1'},
  deagle: {name:'Desert Eagle', slot:2, clip:7, reserve:35, damage:54, interval:.225, reload:2.2, cost:650, speed:250, recoil:.025, spread:.006, sound:'deagle-1'},
  usp: {name:'USP', slot:2, clip:12, reserve:100, damage:30, interval:.15, reload:2.7, cost:500, speed:250, recoil:.014, spread:.006, sound:'usp1'},
  glock: {name:'Glock 18', slot:2, clip:20, reserve:120, damage:25, interval:.15, reload:2.2, cost:400, speed:250, recoil:.01, spread:.008, sound:'glock18-2'},
  knife: {name:'匕首', slot:3, clip:0, reserve:0, damage:20, interval:.4, reload:0, cost:0, speed:250, recoil:0, spread:0, sound:'knife_slash1'},
  he: {name:'高爆手雷', slot:4, clip:1, reserve:0, damage:100, interval:1, reload:0, cost:300, speed:250, recoil:0, spread:0, sound:'pinpull'},
  c4: {name:'C4 炸药', slot:5, clip:0, reserve:0, damage:0, interval:1, reload:0, cost:0, speed:250, recoil:0, spread:0}
};
for(const id of ['butterfly','karambit'])WEAPONS[id]={...WEAPONS.knife,name:meleeNames[id]};
const NAMES = ['Player','Gabe','Phoenix','Ivan','Yanni','Fergus','Quinn','Minh','Boris','Cliffe'];
const BOT_TUNING = {
  easy: {
    reaction:1.0, jitter:.35, turn:2.0, pitch:1.1, halfFov:65,
    headChance:0, headDelay:2, burst:1, pause:1.05, shotGap:.32,
    centerAimChance:.38, bodyAim:32, crouchAim:16, tracking:4, aimError:.025,
    scopeDelay:1.5, sniperChance:0, grenades:false
  },
  normal: {
    reaction:.60, jitter:.25, turn:3.0, pitch:1.6, halfFov:75,
    headChance:.025, headDelay:1.25, burst:2, pause:.65, shotGap:.18,
    centerAimChance:.62, bodyAim:37, crouchAim:19, tracking:7, aimError:.014,
    scopeDelay:1.25, sniperChance:.20, grenades:true
  },
  hard: {
    reaction:.27, jitter:.15, turn:4.4, pitch:2.5, halfFov:85,
    headChance:.20, headDelay:.75, burst:4, pause:.24, shotGap:0,
    centerAimChance:.86, bodyAim:43, crouchAim:21, tracking:14, aimError:.006,
    scopeDelay:.85, sniperChance:.65, grenades:true
  }
};
function botRoundRandom(salt) {
  const value=Math.sin((G.aiSeed||0)*9237+G.round*73.7+salt*127.1)*43758.5453;
  return value-Math.floor(value);
}
const G = {
  state:'loading', phase:'menu', mapName:'de_dust2', map:null, models:null, nav:null,
  actors:[], hostages:[], grenades:[], drops:[], effects:[], player:null,
  score:{CT:0,T:0}, round:0, time:120, phaseTime:0, elapsed:0, buyTime:0,
  difficulty:'normal', quality:'high', initialMoney:16000, team:'CT', aiSeed:Math.random(),
  bomb:{carrier:null,planted:false,pos:V(),timer:35,progress:0,defuse:0,defuser:null},
  ready:false, fatal:null, muted:false, viewWeapon:null, viewId:null,
  spectatorTarget:null, spectatorCamera:null, spectatorWeapon:null, spectatorWeaponKey:null, activeViewWeapon:null,
  fireHeld:false, fireEdge:false, altEdge:false, useHeld:false, useEdge:false,
  recoil:0, kick:0, scope:0, damage:0, flash:0, feed:[], events:[], frames:[], cpuFrames:[],
  firstPlayable:0, loadTime:0, mapLoad:0, task:null, graph:false, winner:null,
  input:new Set(), accumulator:0, menuCamera:null, navCache:new Map()
};
let renderer, scene, camera, viewScene, viewCamera, muzzleFlash, audioContext;
let audioBuffers = new Map();
let rafPrevious = performance.now(), hudPrevious = 0;
let drag = false, mouseLast = [0,0];
const eventLog = (name, details = {}) => {
  G.events.push({name, at:+G.elapsed.toFixed(2), round:G.round, ...details});
  if (G.events.length > 200) G.events.shift();
};

async function unpack(encoded) {
  const text = atob(encoded);
  const bytes = Uint8Array.from(text, character => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
function showLoad(text, progress) {
  $('loadText').textContent = text;
  $('loadProgress').value = progress;
}
function setQuality() {
  G.quality = $('quality').value;
  const scale = {low:.65,medium:.85,high:1}[G.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * scale);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = viewCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  viewCamera.updateProjectionMatrix();
  if (G.map) G.map.setQuality(G.quality);
}
function resetInput() {
  cancelGrenadeAim();
  G.input.clear();
  G.fireHeld = G.fireEdge = G.altEdge = G.useHeld = G.useEdge = false;
  G.jumpQueued=false;
  drag = false;
}
// Let the browser retain Escape and shortcuts unrelated to the game's controls.
const gameKeyCodes=new Set(['KeyW','KeyA','KeyS','KeyD','KeyC','KeyE','KeyR','KeyG','KeyB',
  'Digit1','Digit2','Digit3','Digit4','Digit5','Space','Tab','F3']);
let keyCapture='idle',keyCaptureGeneration=0,keyCaptureDenied=false;
let expectedFullscreenExit=false;
function releaseGameKeys(){
  if(keyCapture==='idle')return;
  keyCaptureGeneration++;
  keyCapture='idle';
  navigator.keyboard?.unlock?.();
}
async function syncGameKeys(){
  if(!document.fullscreenElement || G.state!=='playing' || document.hidden || !document.hasFocus() || !$('buy').classList.contains('hidden')){
    releaseGameKeys();return;
  }
  if(!navigator.keyboard?.lock || keyCaptureDenied || keyCapture!=='idle')return;
  const generation=++keyCaptureGeneration;
  keyCapture='pending';
  try{
    await navigator.keyboard.lock([...gameKeyCodes]);
    if(generation===keyCaptureGeneration)keyCapture='active';
    else if(keyCapture==='idle')navigator.keyboard.unlock();
  }catch{
    if(generation!==keyCaptureGeneration)return;
    keyCapture='idle';keyCaptureDenied=true;
    hint('浏览器未启用键盘锁定，可按 C 蹲伏，再按 E 交互',6);
  }
}
async function playFullscreen(action){
  keyCaptureDenied=false;
  if(!document.fullscreenElement){
    try{await document.documentElement.requestFullscreen();}
    catch{/* Continue in the window when fullscreen is unavailable. */}
  }
  await action();
  if(G.state==='playing'&&(!document.fullscreenElement||!navigator.keyboard?.lock)){
    hint('当前浏览器可用 C 蹲伏，再按 E 交互',6);
  }
}
async function leaveGameFullscreen(){
  if(!document.fullscreenElement)return;
  // The fullscreenchange event can arrive after exitFullscreen resolves and a new round starts.
  expectedFullscreenExit=true;
  try{await document.exitFullscreen();}
  catch{expectedFullscreenExit=false;}
}
function requestMouse() {
  syncGameKeys();
  initAudio();
  try {
    const result = $('game').requestPointerLock();
    if (result && result.catch) result.catch(() => hint('按住左键拖动可转向', 4));
  } catch (_) { hint('按住左键拖动可转向', 4); }
}
function closePointer() {
  if (document.pointerLockElement) {G.pointerUnlockExpected=true;document.exitPointerLock();}
}
function hint(message, seconds = 2) {
  G.hintText = message;
  G.hintUntil = G.elapsed + seconds;
}
function announce(message, seconds = 3) {
  G.message = message;
  G.messageUntil = G.elapsed + seconds;
}
function eye(actor) {return actor.pos.clone().add(V(0, actor.crouch ? 28 : 64, 0));}
function forward(yaw, pitch = 0) {return V(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));}
function center(actor, position = actor.pos) {return position.clone().add(V(0,actor.crouch ? 18 : 36,0));}
function hull(actor) {return actor.crouch ? 3 : 1;}
function distanceFlat(a,b) {return Math.hypot(a.x-b.x,a.z-b.z);}
function entityPosition(entity) {
  if (entity.position) return V(...entity.position);
  if (entity.bounds) return V(...entity.bounds.min).add(V(...entity.bounds.max)).multiplyScalar(.5);
  return V();
}
function entityYaw(entity) {
  const degrees=entity.angles?Number(entity.angles.split(/\s+/)[1]):Number(entity.angle||0);
  return (degrees-90)*Math.PI/180;
}
function inBounds(position, bounds, padding = 0) {
  return position.x >= bounds.min[0]-padding && position.x <= bounds.max[0]+padding &&
    position.y >= bounds.min[1]-padding && position.y <= bounds.max[1]+padding &&
    position.z >= bounds.min[2]-padding && position.z <= bounds.max[2]+padding;
}
function lineClear(a,b) {return G.map.trace(a,b,0).fraction > .995;}

/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
/* Uses original CSbot v5 convex navigation areas and their authored adjacency. */
class Navigation {
  constructor(map) {
    this.map=map;
    this.nodes=[];
    this.areas=[];
    this.cells=new Map();
    this.step=25;
    this.ladderLinks=0;
    this.blocked=new Set();
  }
  height(area,x,z) {
    const b=area.bounds;
    const u=clamp((x-b[0])/(b[3]-b[0]||1),0,1);
    const v=clamp((-z-b[1])/(b[4]-b[1]||1),0,1);
    return b[2]*(1-u)*(1-v)+area.heights[0]*u*(1-v)+b[5]*u*v+area.heights[1]*(1-u)*v+.12;
  }
  point(area,x,z) {
    const p=V(x,this.height(area,x,z),z),crouch=!!(area.flags&1),height=crouch?18:36;
    const above=p.clone().add(V(0,height+36,0));
    const down=this.map.trace(above,p.clone().add(V(0,height-70,0)),crouch?3:1);
    if(down.hit&&!down.allSolid&&down.plane.normal.y>.65&&Math.abs(down.endPos.y-height-p.y)<38)p.y=down.endPos.y-height+.1;
    return p;
  }
  addNode(p,crouch=false,area=null) {
    const index=this.nodes.length;
    this.nodes.push({p,crouch,area,links:[],originalLinks:[],x:Math.round(p.x/25),z:Math.round(p.z/25)});
    return index;
  }
  connect(first,second,ladder=false) {
    if(first===second)return;
    const distance=Math.max(.1,this.nodes[first].p.distanceTo(this.nodes[second].p));
    const rise=this.nodes[second].p.y-this.nodes[first].p.y;
    const extra=this.map.name==='de_dust2'?(rise>20?900:rise < -60?500:0):0;
    const weight=distance*(ladder?3:this.nodes[second].crouch?1.8:1)*(this.map.name==='cs_assault'&&rise>20?4:1)+extra;
    if(!this.addingConnections)this.nodes[first].originalLinks.push([second,weight,ladder]);
    if(this.map.name==='de_dust2'&&!ladder&&rise < -38) {
      const crouch=this.nodes[first].crouch||this.nodes[second].crouch;
      const height=crouch?18:36;
      const start=this.nodes[first].p.clone().add(V(0,height,0));
      const end=this.nodes[second].p.clone().add(V(0,height,0));
      const trace=this.map.trace(start,end,crouch?3:1);
      const slope=trace.plane.normal.y>.65&&distanceFlat(start,end)>Math.abs(rise)*1.8;
      if(trace.fraction<.99&&!slope)return;
    }
    this.nodes[first].links.push([second,weight,ladder]);
  }
  async build() {
    this.areas=this.map.navAreas||[];
    const byId=new Map();
    for(const area of this.areas) {
      const b=area.bounds;
      area.node=this.addNode(this.point(area,(b[0]+b[3])/2,-(b[1]+b[4])/2),!!(area.flags&1),area);
      byId.set(area.id,area);
    }
    const portals=new Map();
    for(const area of this.areas) {
      for(const id of area.connections.flat()) {
        const other=byId.get(id);if(!other)continue;
        const key=Math.min(area.id,id)+','+Math.max(area.id,id);
        let pair=portals.get(key);
        if(!pair) {
          const a=area.bounds,b=other.bounds;
          const overlapX=[Math.max(a[0],b[0]),Math.min(a[3],b[3])];
          const overlapY=[Math.max(a[1],b[1]),Math.min(a[4],b[4])];
          let ax,bx,az,bz;
          if(overlapX[0]<=overlapX[1])ax=bx=(overlapX[0]+overlapX[1])/2;
          else {ax=clamp((b[0]+b[3])/2,a[0],a[3]);bx=clamp((a[0]+a[3])/2,b[0],b[3]);}
          if(overlapY[0]<=overlapY[1])az=bz=-(overlapY[0]+overlapY[1])/2;
          else {az=-clamp((b[1]+b[4])/2,a[1],a[4]);bz=-clamp((a[1]+a[4])/2,b[1],b[4]);}
          const crouch=!!((area.flags|other.flags)&1);
          let firstPoint=this.point(area,ax,az);
          let secondPoint=this.point(other,bx,bz);
          if(this.map.name==='cs_assault'&&Math.abs(firstPoint.y-secondPoint.y)>50) {
            ax+=clamp((a[0]+a[3])/2-ax,-20,20);
            az+=clamp(-(a[1]+a[4])/2-az,-20,20);
            bx+=clamp((b[0]+b[3])/2-bx,-20,20);
            bz+=clamp(-(b[1]+b[4])/2-bz,-20,20);
            firstPoint=this.point(area,ax,az);
            secondPoint=this.point(other,bx,bz);
          }
          const first=this.addNode(firstPoint,crouch,area);
          const second=this.addNode(secondPoint,crouch,other);
          pair={area:area.id,first,second};portals.set(key,pair);
        }
        const first=pair.area===area.id?pair.first:pair.second;
        const second=pair.area===area.id?pair.second:pair.first;
        const aNode=this.nodes[first],bNode=this.nodes[second];
        const aHeight=aNode.crouch?18:36,bHeight=bNode.crouch?18:36;
        if(this.map.name==='de_dust2'&&(this.map.pointContents(aNode.p.clone().add(V(0,aHeight,0)),aNode.crouch?3:1)===-2||this.map.pointContents(bNode.p.clone().add(V(0,bHeight,0)),bNode.crouch?3:1)===-2))continue;
        this.connect(area.node,first);this.connect(first,second);this.connect(second,other.node);
      }
    }
    this.addLadders();
    this.nodes.forEach((node,index)=>{
      const height=node.crouch?18:36;
      if(this.map.pointContents(node.p.clone().add(V(0,height,0)),node.crouch?3:1)===-2)this.blocked.add(index);
    });
    for(const node of this.nodes) {
      node.links=node.links.filter(([index])=>!this.blocked.has(index));
      node.originalLinks=node.originalLinks.filter(([index])=>!this.blocked.has(index));
    }
    this.addingConnections=true;this.connectNearbyNodes();this.addingConnections=false;
    await sleepFrame();
  }
  connectNearbyNodes() {
    const cells=new Map(),size=64;
    this.nodes.forEach((node,index)=>{
      if(this.blocked.has(index)||node.ladderEntity)return;
      const key=Math.floor(node.p.x/size)+','+Math.floor(node.p.z/size);
      const cell=cells.get(key)||[];cell.push(index);cells.set(key,cell);
    });
    for(let index=0;index<this.nodes.length;index++) {
      const node=this.nodes[index];
      if(this.blocked.has(index)||node.ladderEntity)continue;
      const x=Math.floor(node.p.x/size),z=Math.floor(node.p.z/size),candidates=[];
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
        for(const other of cells.get((x+dx)+','+(z+dz))||[]) {
          if(other<=index||node.links.some(link=>link[0]===other))continue;
          const target=this.nodes[other];
          if(Math.abs(node.p.y-target.p.y)>18.1||node.p.distanceToSquared(target.p)>64*64)continue;
          candidates.push(other);
        }
      }
      candidates.sort((a,b)=>node.p.distanceToSquared(this.nodes[a].p)-node.p.distanceToSquared(this.nodes[b].p));
      for(const other of candidates.slice(0,10)) {
        const target=this.nodes[other],crouch=node.crouch||target.crouch,height=crouch?18:36,hullIndex=crouch?3:1;
        const y=Math.max(node.p.y,target.p.y)+height+.1;
        const a=V(node.p.x,y,node.p.z),b=V(target.p.x,y,target.p.z);
        if(this.map.trace(node.p.clone().add(V(0,height,0)),a,hullIndex).fraction<.995||this.map.trace(target.p.clone().add(V(0,height,0)),b,hullIndex).fraction<.995)continue;
        if(this.map.trace(a,b,hullIndex).fraction<.995)continue;
        let supported=true;
        for(const fraction of [.25,.5,.75]) {
          const sample=a.clone().lerp(b,fraction);
          const down=this.map.trace(sample,sample.clone().add(V(0,-40,0)),hullIndex);
          if(!down.hit||down.allSolid||down.plane.normal.y<.65||down.endPos.y-height<Math.min(node.p.y,target.p.y)-4){supported=false;break;}
        }
        if(supported){this.connect(index,other);this.connect(other,index);}
      }
    }
  }
  nearestArea(position,maxDistance=Infinity) {
    let best=-1,bestDistance=maxDistance*maxDistance;
    for(const area of this.areas) {
      if(this.blocked.has(area.node))continue;
      const b=area.bounds;
      const x=clamp(position.x,b[0],b[3]),z=-clamp(-position.z,b[1],b[4]);
      const y=this.height(area,x,z);
      const distance=(x-position.x)**2+(z-position.z)**2+(y-position.y)**2*3;
      if(distance<bestDistance){best=area.node;bestDistance=distance;}
    }
    return best;
  }
  nearest(position,maxDistance=Infinity) {
    let ladder=-1,bestDistance=Math.min(maxDistance*maxDistance,32*32);
    for(const index of this.ladderNodes||[]) {
      const distance=this.nodes[index].p.distanceToSquared(position);
      if(distance<bestDistance){bestDistance=distance;ladder=index;}
    }
    return ladder>=0?ladder:this.nearestArea(position,maxDistance);
  }
  addLadders() {
    this.ladderNodes=[];
    for(const entity of this.map.entities.filter(e=>e.classname==='func_ladder'&&e.bounds)) {
      const bounds=entity.bounds;
      const x=(bounds.min[0]+bounds.max[0])/2,z=(bounds.min[2]+bounds.max[2])/2;
      const lower=this.nearestArea(V(x,bounds.min[1],z),150);
      const upper=this.nearestArea(V(x,bounds.max[1],z),180);
      if(lower<0||upper<0||lower===upper)continue;
      const lowerArea=this.nodes[lower].area,upperArea=this.nodes[upper].area;
      const bottom=this.height(lowerArea,x,z),top=this.height(upperArea,x,z);
      if(top-bottom<28)continue;
      const thinX=bounds.max[0]-bounds.min[0]<bounds.max[2]-bounds.min[2];
      let anchor=null;
      const preferred=thinX?Math.sign(this.nodes[lower].p.x-x):Math.sign(this.nodes[lower].p.z-z);
      for(const sign of [preferred||1,-(preferred||1)]) {
        const p=V(x+(thinX?sign*21:0),(bottom+top)/2,z+(thinX?0:sign*21));
        if(this.map.pointContents(p.clone().add(V(0,36,0)),1)!==-2){anchor=p;break;}
      }
      if(!anchor)continue;
      const bottomPoint=anchor.clone();bottomPoint.y=bottom;
      const topPoint=anchor.clone();topPoint.y=top;
      const base=this.addNode(bottomPoint),summit=this.addNode(topPoint);
      this.ladderNodes.push(base,summit);
      this.nodes[base].ladderEntity=this.nodes[summit].ladderEntity=entity;
      this.connect(lower,base);this.connect(base,lower);
      this.connect(base,summit,true);this.connect(summit,base,true);
      this.connect(summit,upper);this.connect(upper,summit);
      this.ladderLinks++;
    }
  }
  startNode(position,actor) {
    const fallback=this.nearest(position);
    if(!actor)return fallback;
    const crouch=actor.crouch,height=crouch?18:36,hullIndex=crouch?3:1;
    const center=position.clone().add(V(0,height,0));
    let best=fallback,bestScore=Infinity;
    for(let index=0;index<this.nodes.length;index++) {
      const node=this.nodes[index];
      if(this.blocked.has(index)||Math.abs(node.p.y-position.y)>45)continue;
      const distance=node.p.distanceToSquared(position);
      if(distance>220*220||distance>=bestScore)continue;
      const target=node.p.clone().add(V(0,height,0));
      if(this.map.trace(center,target,hullIndex).fraction<.995)continue;
      best=index;bestScore=distance;
    }
    return best;
  }
  routeCosts(actor) {
    const congestion=new Map();
    if(!actor?.team)return congestion;
    for(const mate of G.actors) {
      if(mate===actor||mate.team!==actor.team||!mate.alive)continue;
      for(const step of (mate.path||[]).slice(0,12)) {
        const areaId=step.areaId;
        if(areaId!==undefined)congestion.set(areaId,(congestion.get(areaId)||0)+1);
      }
    }
    return congestion;
  }
  path(start,goal,actor=null,policy='tactical') {
    const first=this.startNode(start,actor),last=actor?this.startNode(goal,actor):this.nearest(goal);
    if(first<0||last<0)return [];
    const open=[first],cost=new Map([[first,0]]),parents=new Map(),closed=new Set();
    const congestion=this.routeCosts(actor);
    const seed=actor?.navState?.seed||0;
    const failures=actor?.navState?.failures;
    const now=G.elapsed;
    let closest=first,closestDistance=Infinity;
    for(let visited=0;open.length&&visited<20000;visited++) {
      let pick=0,score=Infinity;
      for(let i=0;i<open.length;i++) {
        const n=open[i],estimate=cost.get(n)+this.nodes[n].p.distanceTo(this.nodes[last].p);
        if(estimate<score){score=estimate;pick=i;}
      }
      const current=open.splice(pick,1)[0];
      const distance=this.nodes[current].p.distanceTo(this.nodes[last].p);
      if(distance<closestDistance){closest=current;closestDistance=distance;}
      if(current===last)break;
      closed.add(current);
      for(const [next,weight,ladder] of (actor?this.nodes[current].links:this.nodes[current].originalLinks)) {
        if(closed.has(next))continue;
        const edge=current+':'+next;
        const failure=failures?.get(edge);
        const failedCost=failure&&failure.until>now?6000*failure.count:0;
        const areaId=this.nodes[next].area?.id;
        const entering=areaId!==this.nodes[current].area?.id;
        const hash=Math.imul((areaId||next)+seed*131,2654435761)>>>0;
        const direct=policy==='direct'||actor?.botAction==='approach-bomb';
        const personal=actor&&!direct?1+(hash%101)/160:1;
        const crowd=entering?(congestion.get(areaId)||0)*12:0;
        const nextCost=cost.get(current)+weight*personal+crowd+failedCost;
        if(nextCost>=(cost.get(next)??Infinity))continue;
        cost.set(next,nextCost);parents.set(next,[current,ladder]);
        if(!open.includes(next))open.push(next);
      }
    }
    const path=[];
    let current=closest;
    while(current!==first&&parents.has(current)) {
      const [parent,ladder]=parents.get(current),node=this.nodes[current];
      path.unshift({pos:node.p.clone(),crouch:node.crouch,ladder,ladderEntity:node.ladderEntity,jump:!!(node.area?.flags&2),nodeId:current,fromNode:parent,areaId:node.area?.id});
      current=parent;
    }
    return path;
  }
}



async function initAudio() {
  if(!audioContext) {
    audioContext=new (window.AudioContext||window.webkitAudioContext)();
    for(const [name,encoded] of Object.entries(ASSET_AUDIO)) {
      if(!encoded) continue;
      const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
      audioContext.decodeAudioData(bytes.buffer).then(buffer=>audioBuffers.set(name,buffer)).catch(()=>{});
    }
  }
  if(audioContext.state==='suspended') await audioContext.resume();
}
function sound(name,position=null,volume=1) {
  if(G.muted||!audioContext||!audioBuffers.has(name))return;
  const source=audioContext.createBufferSource();source.buffer=audioBuffers.get(name);
  const gain=audioContext.createGain();
  let level=volume*.65;
  if(position&&G.player)level*=clamp(1-position.distanceTo(camera.position)/2100,0,.8);
  if(level<.01)return;
  gain.gain.value=level;source.connect(gain);
  if(position) {
    const pan=audioContext.createStereoPanner();
    const difference=position.clone().sub(camera.position).normalize();
    pan.pan.value=clamp(difference.dot(V(Math.cos(camera.rotation.y),0,-Math.sin(camera.rotation.y))),-1,1);
    gain.connect(pan);pan.connect(audioContext.destination);
  } else gain.connect(audioContext.destination);
  source.start();
}
function stepSound(actor) {
  if(!audioContext||G.muted||!actor.grounded||actor.vel.length()<100)return;
  if(audioBuffers.has('pl_step1')) {sound('pl_step'+(1+Math.floor(Math.random()*4)),actor.human?null:actor.pos,actor.human?.3:.4);return;}
  const buffer=audioContext.createBuffer(1,2205,22050),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()-.5)*Math.exp(-i/350)*.35;
  const source=audioContext.createBufferSource();source.buffer=buffer;
  const gain=audioContext.createGain();gain.gain.value=actor===G.player?.12:.07*clamp(1-actor.pos.distanceTo(G.player.pos)/700,0,1);
  source.connect(gain);gain.connect(audioContext.destination);source.start();
}

async function changeMap(name) {
  const begin=performance.now();
  resetRoundObjects();
  if(G.nav)G.nav.map=null;
  if(G.map)G.map.dispose();
  G.mapName=name;
  showLoad('正在载入 '+name+' 夜景…',3);
  G.map=await createGoldSrcMap(THREE,ASSET_MAPS[name],scene);
  G.map.setQuality(G.quality);
  G.breakables=G.map.entities.filter(e=>e.classname==='func_breakable').map(entity=>({entity,index:Number(entity.model.slice(1)),health:Number(entity.health||10),initialHealth:Number(entity.health||10)}));
  G.sites=G.map.entities.filter(e=>e.classname==='func_bomb_target'||e.classname==='info_bomb_target').map((entity,index)=>{
    const pos=entityPosition(entity);if(entity.bounds)pos.y=entity.bounds.min[1]+.15;
    return {entity,pos,name:index===0?'B':'A'};
  });
  G.rescues=G.map.entities.filter(e=>e.classname==='func_hostage_rescue'||e.classname==='info_hostage_rescue');
  G.ladders=G.map.entities.filter(e=>e.classname==='func_ladder'&&e.bounds);
  G.spawnCT=G.map.entities.filter(e=>e.classname==='info_player_start');
  G.spawnT=G.map.entities.filter(e=>e.classname==='info_player_deathmatch');
  if(G.navCache.has(name))G.nav=G.navCache.get(name);
  else {
    showLoad('正在准备机器人多层寻路…',4);
    G.nav=new Navigation(G.map);await G.nav.build();G.navCache.set(name,G.nav);
  }
  G.nav.map=G.map;
  G.doors=G.map.entities.filter(e=>e.classname==='func_door'||e.classname==='func_door_rotating').map(entity=>{
    const index=Number(entity.model.slice(1));
    const group=G.map.modelGroups[index];
    const direction=forward(entityYaw(entity));
    const size=V(...entity.bounds.max).sub(V(...entity.bounds.min));
    return {entity,index,group,base:group.position.clone(),amount:0,openUntil:0,direction,distance:Math.abs(direction.x*size.x)+Math.abs(direction.z*size.z)-Number(entity.lip||0)};
  });
  resetDoors();
  G.mapLoad=performance.now()-begin;
  const works=name==='cs_assault';
  G.menuCamera=works?V(112,157,-1030):V(-1770,155,-2780);
  const target=works?V(148,242,-1600):V(-1300,179,-2700);
  const look=target.sub(G.menuCamera).normalize();
  G.menuYaw=Math.atan2(-look.x,-look.z);G.menuPitch=Math.asin(look.y);
  $('menuMap').innerHTML=works?'<small>CS_ASSAULT</small>机修总厂':'<small>DE_DUST2</small>夜间转运站';
  camera.position.copy(G.menuCamera);camera.rotation.set(G.menuPitch,G.menuYaw,0,'YXZ');

}
function resetRoundObjects() {
  cancelGrenadeAim();
  clearHitMarker();clearCombatMedal();clearBlasts();
  clearSpectatorView();
  for(const actor of [...G.actors,...G.hostages]) {
    if(actor.mesh){scene.remove(actor.mesh);actor.mesh.dispose();}
  }
  for(const item of [...G.drops,...G.grenades,...G.effects])if(item.mesh){scene.remove(item.mesh);item.mesh.dispose?.();}
  G.actors=[];G.hostages=[];G.drops=[];G.grenades=[];G.effects=[];
  if(G.viewWeapon){viewScene.remove(G.viewWeapon);G.viewWeapon.dispose();G.viewWeapon=null;G.viewId=null;}
  G.player=null;G.feed=[];G.task=null;G.scope=0;G.damage=0;G.flash=0;
}
function freshWeapon(id,finish) {return {id,finish,ammo:WEAPONS[id].clip,reserve:WEAPONS[id].reserve,silenced:id==='m4a1'||id==='usp',burst:false};}
function createActor(id,team,spawn,human) {
  const original=entityPosition(spawn);
  const floor=G.map.trace(original,original.clone().add(V(0,-128,0)),1);
  const pos=floor.endPos.add(V(0,-35.9,0));
  const pistol=team==='CT'?'usp':'glock',melee=human?preferredMelee:'knife';
  const actor={id,team,human,name:human?'Player':NAMES[id],pos,vel:V(),yaw:entityYaw(spawn),pitch:0,hp:100,armor:0,helmet:false,alive:true,crouch:false,grounded:true,
    inventory:{2:freshWeapon(pistol,human?finishPreferences[pistol]:undefined),3:freshWeapon(melee,human?finishPreferences[melee]:undefined)},slot:2,money:G.initialMoney,kills:0,deaths:0,kit:false,
    cooldown:0,reload:0,reloadId:null,accuracy:0,think:0,target:null,path:[],pathTime:0,goal:null,taskProgress:0,lastUse:0,stepTime:0,stuckTime:0,lastPos:pos.clone(),react:0,shotFlash:0};
  actor.mesh=G.models.createActor(team);actor.mesh.position.copy(pos);scene.add(actor.mesh);
  return actor;
}
function equipBot(actor) {
  if(!actor.inventory[1]) {
    const teamSalt=actor.team==='CT'?19:43;
    const slots=actor.team===G.team?[1,2,3,4]:[5,6,7,8,9];
    const sniper=slots[Math.floor(botRoundRandom(teamSalt)*slots.length)];
    const wantsSniper=actor.id===sniper&&!(G.roundSnipers?.[actor.team])&&botRoundRandom(teamSalt+1)<BOT_TUNING[G.difficulty].sniperChance;
    const id=wantsSniper&&actor.money>=5750?'awp':actor.team==='CT'?'m4a1':'ak47';
    if(actor.money>=WEAPONS[id].cost){actor.inventory[1]=freshWeapon(id);actor.money-=WEAPONS[id].cost;if(id==='awp')G.roundSnipers[actor.team]++;}
  }
  if(actor.armor<30&&actor.money>=650) {
    const helmet=actor.money>=1000;actor.money-=helmet?1000:650;actor.armor=100;actor.helmet=helmet;
  }
  if(actor.team==='CT'&&!actor.kit&&actor.money>=200){actor.kit=true;actor.money-=200;}
  if(actor.inventory[1]&&actor.money>=300){actor.inventory[1].reserve=WEAPONS[actor.inventory[1].id].reserve;actor.money-=300;}
  if(BOT_TUNING[G.difficulty].grenades&&actor.id%3===0&&actor.money>=300){actor.inventory[4]=freshWeapon('he');actor.money-=300;}
  actor.slot=actor.inventory[1]?1:2;
}
function spawnRound(carry=true) {
  const previous=new Map(G.actors.map(a=>[a.id,{team:a.team,money:a.money,kills:a.kills,deaths:a.deaths,inventory:a.alive?a.inventory:null,armor:a.alive?a.armor:0,kit:a.alive&&a.kit,helmet:a.alive&&a.helmet}]));
  resetRoundObjects();resetInput();resetDoors();resetBreakables();
  G.round++;G.phase='freeze';G.phaseTime=5;G.time=G.mapName==='cs_assault'?180:120;G.elapsed=G.elapsed||0;G.buyTime=30;G.winner=null;
  G.bomb={carrier:null,planted:false,pos:V(),timer:35,progress:0,defuse:0,defuser:null};
  G.roundSnipers={CT:0,T:0};
  if(carry)for(const [id,old] of previous)if(id!==0&&old.inventory?.[1]?.id==='awp')G.roundSnipers[old.team]++;
  let ct=0,t=0;
  for(let id=0;id<10;id++) {
    const team=id<5?G.team:(G.team==='CT'?'T':'CT');
    const spawns=team==='CT'?G.spawnCT:G.spawnT;
    const index=team==='CT'?ct++:t++;
    const actor=createActor(id,team,spawns[index%spawns.length],id===0);
    const old=previous.get(id);
    if(carry&&old) {
      actor.money=old.money;actor.kills=old.kills;actor.deaths=old.deaths;
      if(old.inventory){actor.inventory=old.inventory;actor.slot=actor.inventory[1]?1:2;actor.armor=old.armor;actor.helmet=old.helmet;actor.kit=old.kit;}
    }
    delete actor.inventory[5];
    if(!actor.human)equipBot(actor);
    G.actors.push(actor);if(id===0)G.player=actor;
  }
  if(G.mapName==='de_dust2') {
    const carrier=G.actors.find(a=>a.team==='T');G.bomb.carrier=carrier.id;carrier.inventory[5]=freshWeapon('c4');
  } else {
    for(const entity of G.map.entities.filter(e=>e.classname==='hostage_entity')) {
      const pos=entityPosition(entity);
      const down=G.map.trace(pos.clone().add(V(0,40,0)),pos.clone().add(V(0,-128,0)),0);
      pos.y=down.endPos.y+.2;
      const hostage={id:G.hostages.length,pos,vel:V(),alive:true,hp:100,crouch:false,grounded:true,owner:null,rescued:false,path:[],pathTime:0,lastPos:pos.clone(),mesh:G.models.createActor('ct',true)};
      hostage.mesh.position.copy(pos);scene.add(hostage.mesh);G.hostages.push(hostage);
    }
  }
  setWeapon(G.player.slot);G.spectatorTarget=null;
  announce('第 '+G.round+' 回合\n'+(G.mapName==='de_dust2'?'爆破任务':'人质营救'),3);
  hint('B 购买装备 · '+(G.team==='T'&&G.mapName==='de_dust2'?'5 切换 C4，在包点按住左键安放':'E 使用 / 拆弹'),7);
  eventLog('round_start',{map:G.mapName});
}
function setWeapon(slot) {
  const actor=G.player;if(!actor||!actor.inventory[slot])return;
  cancelGrenadeAim();
  if(G.viewWeapon){viewScene.remove(G.viewWeapon);G.viewWeapon.dispose();}
  actor.slot=+slot;actor.reload=0;actor.reloadId=null;actor.burstRemaining=0;actor.scopeTimer=0;actor.resumeScope=0;actor.cooldown=.35;
  G.scope=0;G.recoil=0;G.viewId=actor.inventory[slot].id;
  G.viewWeapon=G.models.createViewWeapon(G.viewId,actor.inventory[slot].finish);viewScene.add(G.viewWeapon);
  if(G.viewWeapon.setSilenced&&['m4a1','usp'].includes(G.viewId)) {
    G.viewWeapon.setSilenced(actor.inventory[slot].silenced!==false,false);G.viewWeapon.play('draw');
  }
  eventLog('weapon_switch',{weapon:G.viewId});
}
function cycleWeapon(direction) {
  const actor=G.player;if(!actor||!actor.alive)return;
  const slots=Object.keys(actor.inventory).map(Number).sort();
  const next=(slots.indexOf(actor.slot)+direction+slots.length)%slots.length;
  setWeapon(slots[next]);
}
function reload(actor) {
  const item=actor.inventory[actor.slot],weapon=WEAPONS[item.id];
  if(actor.reload||item.ammo>=weapon.clip||item.reserve<=0||weapon.slot>2)return;
  actor.reload=weapon.reload;actor.reloadId=item.id;actor.cooldown=Math.max(actor.cooldown,weapon.reload);
  actor.burstRemaining=0;
  actor.scopeTimer=0;actor.resumeScope=0;
  if(actor.human){G.viewWeapon.play('reload');G.scope=0;eventLog('reload',{weapon:item.id});}
  sound(item.id==='awp'?'awp_clipout':item.id==='deagle'?'de_clipout':item.id==='glock'?'clipout1':item.id+'_clipout',actor.human?null:actor.pos,.6);
}
function updateWeapon(actor,dt) {
  actor.cooldown=Math.max(0,actor.cooldown-dt);actor.accuracy=Math.max(0,actor.accuracy-dt*2.8);actor.shotFlash=Math.max(0,actor.shotFlash-dt);
  if(actor.scopeTimer>0) {
    actor.scopeTimer-=dt;
    if(actor.scopeTimer<=0&&actor.alive&&actor.inventory[actor.slot]?.id==='awp'&&!actor.reload){G.scope=actor.resumeScope;actor.resumeScope=0;}
  }
  if(actor.burstRemaining>0) {
    actor.burstTimer-=dt;
    if(actor.burstTimer<=0) {
      actor.burstRemaining--;actor.burstTimer=.06;
      if(actor.alive&&G.phase==='live'&&!actor.reload)shoot(actor,false,true);
      else actor.burstRemaining=0;
    }
  }
  if(actor.reload>0) {
    actor.reload-=dt;
    if(actor.reload<=0) {
      const item=Object.values(actor.inventory).find(item=>item.id===actor.reloadId);
      if(item){const amount=Math.min(WEAPONS[item.id].clip-item.ammo,item.reserve);item.ammo+=amount;item.reserve-=amount;}
      actor.reload=0;actor.reloadId=null;sound('ak47_clipin',actor.human?null:actor.pos,.5);
      if(actor.human)eventLog('reload_done');
    }
  }
}

/* Swept upright cylinders supplement the BSP hulls for living characters. */
function traceCharacterMovement(actor, start, end) {
  let result = G.map.trace(start, end, hull(actor));
  const delta = end.clone().sub(start);
  const halfHeight = actor.crouch ? 18 : 36;
  const horizontalLength = delta.x * delta.x + delta.z * delta.z;
  for (const other of G.actors) {
    if (other === actor || !other.alive) continue;
    const offsetX = start.x - other.pos.x;
    const offsetZ = start.z - other.pos.z;
    const radius = 28;
    const radialDistance = offsetX * offsetX + offsetZ * offsetZ - radius * radius;
    const minimumY = other.pos.y - halfHeight;
    const maximumY = other.pos.y + (other.crouch ? 36 : 72) + halfHeight;
    const insideVertical = start.y > minimumY + .01 && start.y < maximumY - .01;
    if (radialDistance < -.01 && insideVertical) continue;

    let horizontalNear = -Infinity;
    let horizontalFar = Infinity;
    if (horizontalLength < 1e-9) {
      if (radialDistance > 0) continue;
    } else {
      const projection = offsetX * delta.x + offsetZ * delta.z;
      const discriminant = projection * projection - horizontalLength * radialDistance;
      if (discriminant < 0) continue;
      const root = Math.sqrt(discriminant);
      horizontalNear = (-projection - root) / horizontalLength;
      horizontalFar = (-projection + root) / horizontalLength;
    }

    let verticalNear = -Infinity;
    let verticalFar = Infinity;
    if (Math.abs(delta.y) < 1e-9) {
      if (start.y < minimumY || start.y > maximumY) continue;
    } else {
      const first = (minimumY - start.y) / delta.y;
      const second = (maximumY - start.y) / delta.y;
      verticalNear = Math.min(first, second);
      verticalFar = Math.max(first, second);
    }
    const entry = Math.max(horizontalNear, verticalNear, 0);
    const exit = Math.min(horizontalFar, verticalFar, 1);
    if (entry > exit || entry > result.fraction || entry > 1 || exit < 0) continue;
    const normal = verticalNear > horizontalNear
      ? V(0, delta.y > 0 ? -1 : 1, 0)
      : V(offsetX + delta.x * entry, 0, offsetZ + delta.z * entry).normalize();
    if (normal.lengthSq() < .5 || delta.dot(normal) >= -1e-7) continue;
    const fraction = Math.max(0, entry - .0001);
    result = {
      fraction,
      endPos: start.clone().addScaledVector(delta, fraction),
      plane: {normal},
      hit: true,
      allSolid: false,
      character: true
    };
  }
  return result;
}

function separateOverlappingCharacters(actor, dt) {
  const correction = V();
  const height = actor.crouch ? 36 : 72;
  for (const other of G.actors) {
    if (other === actor || !other.alive) continue;
    const otherHeight = other.crouch ? 36 : 72;
    if (actor.pos.y >= other.pos.y + otherHeight - .1 || actor.pos.y + height <= other.pos.y + .1) continue;
    const offset = actor.pos.clone().sub(other.pos);
    offset.y = 0;
    const distance = offset.length();
    if (distance < .01 || distance >= 28) continue;
    correction.addScaledVector(offset, (28 - distance) / distance);
  }
  const distance = correction.length();
  if (distance < .001) return;
  correction.multiplyScalar(Math.min(distance, 90 * dt) / distance);
  const origin = center(actor);
  const trace = G.map.trace(origin, origin.clone().add(correction), hull(actor));
  actor.pos.copy(trace.endPos).y -= actor.crouch ? 18 : 36;
}

function slideMove(actor,delta) {
  let start=center(actor),remaining=delta.clone();
  for(let pass=0;pass<4;pass++) {
    const trace=traceCharacterMovement(actor,start,start.clone().add(remaining));
    if(trace.character)actor.contactCharacter=true;
    if(trace.allSolid){actor.vel.set(0,0,0);break;}
    start.copy(trace.endPos);
    if(!trace.hit)break;
    if(trace.plane.normal.y>.7){actor.grounded=true;if(actor.vel.y<0)actor.vel.y=0;}
    const normal=trace.plane.normal;
    remaining.multiplyScalar(1-trace.fraction);
    remaining.addScaledVector(normal,-remaining.dot(normal));
    actor.vel.addScaledVector(normal,-Math.min(0,actor.vel.dot(normal)));
    if(remaining.lengthSq()<.001)break;
  }
  actor.pos.copy(start).y-=actor.crouch?18:36;
}
function moveActor(actor,wish,dt,options={}) {
  actor.contactCharacter=false;
  const wasGrounded=actor.grounded;
  const desiredCrouch=!!options.crouch;
  if(desiredCrouch)actor.crouch=true;
  else if(actor.crouch) {
    const standing=actor.pos.clone().add(V(0,36,0));
    if(G.map.pointContents(standing,1)!==-2)actor.crouch=false;
  }
  const ladder=options.ladder||G.ladders.find(l=>{
    const p=center(actor),b=l.bounds;
    const topPadding=actor.human&&G.input.has('KeyS')?64:24;
    return p.x>=b.min[0]-24&&p.x<=b.max[0]+24&&p.z>=b.min[2]-24&&p.z<=b.max[2]+24&&p.y>=b.min[1]-24&&p.y<=b.max[1]+topPadding&&Math.abs(wish.x)+Math.abs(wish.z)>.1;
  });
  if(ladder) {
    const rise=options.ladderDirection??(actor.human?(G.input.has('KeyS')?-1:1):1);
    actor.vel.copy(wish).multiplyScalar(90);
    if(actor.human&&G.input.has('KeyS')&&ladder.bounds) {
      const b=ladder.bounds;
      if(b.max[0]-b.min[0]<b.max[2]-b.min[2])actor.vel.x=0;
      else actor.vel.z=0;
    }
    actor.vel.y=rise*140;actor.grounded=false;
    slideMove(actor,actor.vel.clone().multiplyScalar(dt));
    if(options.jump)actor.vel.addScaledVector(forward(actor.yaw),220);
    return;
  }
  const item=actor.inventory?actor.inventory[actor.slot]:null;
  const maxSpeed=(actor.crouch?82:options.walk?125:item?WEAPONS[item.id].speed:150)*(options.slow||1);
  if(wasGrounded) {
    const speed=Math.hypot(actor.vel.x,actor.vel.z);
    const drop=Math.max(speed,80)*6*dt;
    const scale=Math.max(0,speed-drop)/(speed||1);
    actor.vel.x*=scale;actor.vel.z*=scale;
  }
  const wishSpeed=Math.min(1,wish.length())*maxSpeed;
  if(wish.lengthSq()>0)wish.normalize();
  const current=actor.vel.x*wish.x+actor.vel.z*wish.z;
  const extra=Math.max(0,(wasGrounded?wishSpeed:Math.min(wishSpeed,30))-current);
  const acceleration=Math.min(extra,(wasGrounded?10:10)*wishSpeed*dt);
  actor.vel.x+=wish.x*acceleration;actor.vel.z+=wish.z*acceleration;
  if(options.jump&&wasGrounded) {
    actor.vel.y=268;actor.grounded=false;
    if(actor.human)eventLog('jump');
  }
  if(!actor.grounded)actor.vel.y-=800*dt;
  else actor.vel.y=-8;
  const before=actor.pos.clone(),originalVelocity=actor.vel.clone();
  const delta=actor.vel.clone().multiplyScalar(dt);
  actor.grounded=false;slideMove(actor,delta);
  const flatDistance=distanceFlat(before,actor.pos);
  if(wasGrounded&&!actor.contactCharacter&&flatDistance+0.01<Math.hypot(delta.x,delta.z)) {
    const failed=actor.pos.clone(),failedVelocity=actor.vel.clone();
    const upStart=center(actor,before);
    const up=G.map.trace(upStart,upStart.clone().add(V(0,18.1,0)),hull(actor));
    actor.pos.copy(up.endPos).y-=actor.crouch?18:36;
    actor.vel.copy(originalVelocity);slideMove(actor,V(delta.x,0,delta.z));
    const down=G.map.trace(center(actor),center(actor).add(V(0,-20.1,0)),hull(actor));
    if(down.hit&&down.plane.normal.y>.7&&distanceFlat(before,actor.pos)>flatDistance) {
      actor.pos.copy(down.endPos).y-=actor.crouch?18:36;actor.grounded=true;actor.vel.y=0;
    } else {actor.pos.copy(failed);actor.vel.copy(failedVelocity);}
  }
  const ground=G.map.trace(center(actor),center(actor).add(V(0,-2.5,0)),hull(actor));
  if(ground.hit&&ground.plane.normal.y>.7&&actor.vel.y<=0) {
    actor.grounded=true;actor.pos.copy(ground.endPos).y-=actor.crouch?18:36;
    if(originalVelocity.y < -580)damageActor(actor,Math.round((-originalVelocity.y-580)*.18),null,'fall');
    actor.vel.y=0;
  }
  actor.stepTime-=dt;
  if(actor.grounded&&!options.walk&&!actor.crouch&&actor.vel.length()>100&&actor.stepTime<=0){stepSound(actor);actor.stepTime=.37;}
  if(actor.pos.y < -5000&&actor.alive)damageActor(actor,999,null,'fall');
  for(const brush of G.breakables||[]) {
    if(brush.health<=0||!(Number(brush.entity.spawnflags||0)&2))continue;
    const b=brush.entity.bounds;
    if(actor.pos.x>=b.min[0]-16&&actor.pos.x<=b.max[0]+16&&actor.pos.z>=b.min[2]-16&&actor.pos.z<=b.max[2]+16&&actor.pos.y<=b.max[1]+1&&actor.pos.y+(actor.crouch?36:72)>=b.min[1])damageBreakable(brush.index,999);
  }
  separateOverlappingCharacters(actor,dt);
}

function raySphere(origin,direction,center,radius) {
  const relative=origin.clone().sub(center),b=relative.dot(direction),c=relative.lengthSq()-radius*radius;
  const discriminant=b*b-c;
  if(discriminant<0)return Infinity;
  const distance=-b-Math.sqrt(discriminant);
  return distance>=0?distance:Infinity;
}
function rayBox(origin,direction,min,max) {
  let near=0,far=8192;
  for(const axis of ['x','y','z']) {
    if(Math.abs(direction[axis])<1e-7){if(origin[axis]<min[axis]||origin[axis]>max[axis])return Infinity;continue;}
    const a=(min[axis]-origin[axis])/direction[axis],b=(max[axis]-origin[axis])/direction[axis];
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return Infinity;
  }
  return near;
}
const effectGeometry=new THREE.SphereGeometry(1,5,4);
const hitStamp=(()=>{
  const ctx=nightCanvas(64,64);
  for(const [x,y,r] of [[21,35,6],[38,20,4],[43,39,5],[29,49,2.5]]){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(226,101,109,.92)');g.addColorStop(.5,'rgba(170,60,75,.65)');g.addColorStop(1,'rgba(154,52,69,0)');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  return nightTexture(ctx);
})();
function removeImpact(effect){scene.remove(effect.mesh);effect.mesh.dispose?.();}
function trackImpact(effect){G.effects.push(effect);if(G.effects.length>70)removeImpact(G.effects.shift());}
const criticalStamp=(()=>{
  const ctx=nightCanvas(64,64);ctx.translate(32,32);ctx.fillStyle='#fff';
  for(const [angle,length] of [[.30,23],[1.42,19],[2.4,27],[3.65,21],[4.92,26],[5.68,18]]){
    ctx.save();ctx.rotate(angle);ctx.beginPath();ctx.moveTo(5,-1.2);ctx.lineTo(length,-.6);
    ctx.lineTo(length+3,0);ctx.lineTo(7,1.9);ctx.closePath();ctx.fill();ctx.restore();
  }
  return nightTexture(ctx);
})();
function addHitFlecks(position,head=false,lethal=false){
  const critical=head||lethal,life=critical?.25:.19,pixelLimit=critical?21:15;
  const material=new THREE.SpriteMaterial({map:critical?criticalStamp:hitStamp,color:lethal?0xffbf6a:head?0xefadff:0xffffff,transparent:true,opacity:.67,depthWrite:false,rotation:Math.random()*Math.PI*2});
  const sprite=new THREE.Sprite(material);
  sprite.position.copy(position);sprite.frustumCulled=false;
  const inView=new THREE.Vector3();
  sprite.onBeforeRender=(_renderer,_scene,cam)=>{
    const depth=-inView.copy(sprite.position).applyMatrix4(cam.matrixWorldInverse).z;
    const maxWorld=pixelLimit*2*Math.max(0,depth)/(cam.projectionMatrix.elements[5]*Math.max(1,innerHeight));
    sprite.scale.setScalar(depth<cam.near+1?0:Math.min(critical?9:6,maxWorld));
    sprite.updateMatrixWorld(true);
  };
  sprite.dispose=()=>material.dispose();scene.add(sprite);trackImpact({mesh:sprite,time:life,fade:life});
}
const impactMaterial=new THREE.MeshBasicMaterial({color:0x241e14});
const bombLightMaterial=new THREE.MeshBasicMaterial({color:0xee2409});
function impact(position,blood=false) {
  if(blood){
    addHitFlecks(position);return;
  }
  const mesh=new THREE.Mesh(effectGeometry,impactMaterial);
  mesh.position.copy(position);mesh.scale.setScalar(1.4);scene.add(mesh);
  trackImpact({mesh,time:8});
}
const hitMarker=document.getElementById('hitMarker');
const combatMedal=document.getElementById('combatMedal');
const medalFace=combatMedal.querySelector('.medalFace'),medalCount=combatMedal.querySelector('.medalCount');
const medalNames={head:'头部命中',kill:'普通击杀',headkill:'爆头击杀',melee:'近战击杀',grenade:'手雷击杀'};
let medalAnimation=null,medalBatch=null,medalHits=0;
function clearCombatMedal(){
  medalAnimation?.cancel();medalAnimation=null;medalBatch=null;medalHits=0;
  medalCount.textContent='';combatMedal.removeAttribute('data-medal');combatMedal.removeAttribute('aria-label');
}
function showCombatMedal(kind,batch=null){
  const active=medalAnimation?.playState==='running';
  if(kind==='head'&&active&&combatMedal.dataset.medal!=='head')return;
  if(batch&&batch===medalBatch&&kind==='grenade'&&active){
    medalCount.textContent='×'+(++medalHits);
    combatMedal.setAttribute('aria-label',medalNames[kind]+' ×'+medalHits);return;
  }
  clearCombatMedal();
  combatMedal.dataset.medal=kind;combatMedal.setAttribute('aria-label',medalNames[kind]);
  medalBatch=batch;medalHits=1;
  const quiet=kind==='head', reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim=medalFace.animate([
    {opacity:0,transform:reduced?'none':'translateY(7%) scale(.78)',offset:0},
    {opacity:1,transform:reduced?'none':'scale(1.07)',offset:.12},
    {opacity:1,transform:'none',offset:.23},
    {opacity:1,transform:'none',offset:.76},
    {opacity:0,transform:reduced?'none':'translateY(-3%) scale(.97)',offset:1}
  ],{duration:quiet?500:1180,easing:'linear'});
  medalAnimation=anim;
  anim.onfinish=()=>{if(medalAnimation===anim)clearCombatMedal();};
}
const hitStyles={
  hit:{rank:0,duration:240,spread:1.15},
  head:{rank:1,duration:260,spread:1.5},
  kill:{rank:2,duration:420,spread:1.5},
  headkill:{rank:3,duration:420,spread:1.5}
};
let hitMarkerAnimation=null;
let lastHitToneAt=-Infinity,lastHitToneRank=-1;
function shortTone(frequency,end,delay,length,volume,type='sine'){
  if(G.muted||!audioContext||audioContext.state!=='running')return;
  const start=audioContext.currentTime+delay,osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(end,start+length);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,start+length);osc.connect(gain);gain.connect(audioContext.destination);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+length+.01);
}
function clearHitMarker(){
  hitMarkerAnimation?.cancel();hitMarkerAnimation=null;
  delete hitMarker.dataset.kind;
  $('crosshair').classList.remove('confirmedKill');
  lastHitToneAt=-Infinity;lastHitToneRank=-1;
}
function showHitMarker(lethal,head=false){
  const kind=lethal?(head?'headkill':'kill'):(head?'head':'hit'),style=hitStyles[kind];
  const now=performance.now();
  if(now-lastHitToneAt>=70 || style.rank>lastHitToneRank){
    if(!head&&!lethal)shortTone(1150,680,0,.045,.048,'triangle');
    if(head)shortTone(1650,860,0,.068,.055,'triangle');
    if(lethal){shortTone(520,688,head?.045:0,.10,.085);shortTone(828,990,head?.105:.06,.14,.074);}
    lastHitToneAt=now;lastHitToneRank=style.rank;
  }
  if(hitMarkerAnimation?.playState==='running'&&hitStyles[hitMarker.dataset.kind].rank>style.rank)return;
  if(hitMarkerAnimation&&hitMarker.dataset.kind===kind){
    hitMarkerAnimation.currentTime=0;hitMarkerAnimation.play();
  }else{
    hitMarkerAnimation?.cancel();hitMarker.dataset.kind=kind;
    $('crosshair').classList.toggle('confirmedKill',lethal);
    const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation=hitMarker.animate([
      {opacity:1,transform:still?'none':'scale('+style.spread+')'},
      {opacity:1,transform:still?'none':'scale(1)',offset:.35},
      {opacity:0,transform:still?'none':'scale(.92)'}
    ],{duration:style.duration,easing:'ease-out'});
    hitMarkerAnimation=animation;
    animation.onfinish=()=>{
      if(hitMarkerAnimation===animation && animation.playState==='finished')clearHitMarker();
    };
  }
}
function damageActor(victim,damage,attacker,weapon,head=false,blastBatch=null) {
  if(!victim.alive||G.phase==='ended')return;
  if(attacker&&victim.team===attacker.team&&victim!==attacker)return;
  if(victim.armor>0&&(!head||victim.helmet)&&weapon!=='fall') {
    const penetration={ak47:.775,m4a1:.7,awp:.975,deagle:.932,usp:.505,glock:.47,knife:.85}[isMelee(weapon)?'knife':weapon]||.5;
    const armorCost=damage*(1-penetration)*.5;
    const spent=Math.min(victim.armor,armorCost);victim.armor-=spent;damage-=spent*2;
  }
  const appliedDamage=Math.round(damage);
  victim.hp-=appliedDamage;
  if(attacker && attacker===G.player && victim.team!==attacker.team && appliedDamage>0){
    const lethal=victim.hp<=0;
    if(attacker.alive)showHitMarker(lethal,head);
    if(lethal){
      const kind=weapon==='he'?'grenade':isMelee(weapon)?'melee':head?'headkill':'kill';
      showCombatMedal(kind,blastBatch);
    }else if(head&&attacker.alive)showCombatMedal('head');
  }
  if(attacker&&attacker.team!==victim.team){victim.lastAttacker=attacker.id;victim.awarenessUntil=G.elapsed+2;}
  if(victim.human){G.damage=.65;G.kick+=.012;eventLog('damage',{damage:appliedDamage,hp:victim.hp,attacker:attacker?.id,weapon,head});}
  if(victim.hp>0)return;
  victim.hp=0;victim.alive=false;victim.deaths++;victim.reload=0;victim.vel.set(0,0,0);
  if(victim.human)cancelGrenadeAim();
  if(attacker&&attacker!==victim){attacker.kills++;attacker.money=Math.min(16000,attacker.money+(isMelee(weapon)?1500:300));}
  if(attacker===victim)attacker.kills--;
  if(G.bomb.carrier===victim.id)dropBomb(victim);
  const killer=attacker?attacker.name:'世界';
  G.feed.push({killer,dead:victim.name,team:attacker?.team||'T',victimTeam:victim.team,weapon,head,time:G.elapsed+7});
  if(G.feed.length>6)G.feed.shift();
  if(victim.human){clearHitMarker();if(combatMedal.dataset.medal==='head')clearCombatMedal();G.scope=0;announce('你阵亡了',2);eventLog('player_death');closeBuy();}
  for(const hostage of G.hostages)if(hostage.owner===victim.id)hostage.owner=null;
  eventLog('kill',{killer:attacker?.id,victim:victim.id,weapon,head});
}
function shoot(actor,alternate=false,burstFollowup=false) {
  const item=actor.inventory[actor.slot],weapon=WEAPONS[item.id];
  const aimRecoil=actor.human?G.recoil:(actor.botRecoil||0);
  if(actor.cooldown>0&&!burstFollowup||actor.reload>0||!actor.alive||G.phase!=='live')return;
  if(item.id==='c4')return;
  if(item.id==='he'){if(!actor.human)throwGrenade(actor);return;}
  if(weapon.clip&&item.ammo===0){actor.burstRemaining=0;sound('dryfire_rifle',actor.human?null:actor.pos,.5);actor.cooldown=.3;reload(actor);return;}
  if(!burstFollowup)actor.cooldown=item.id==='glock'&&item.burst?.5:weapon.interval*(alternate&&isMelee(item.id)?2.5:1);
  if(item.id==='glock'&&item.burst&&!burstFollowup){actor.burstRemaining=2;actor.burstTimer=.06;}
  actor.shotFlash=.06;
  if(weapon.clip)item.ammo--;
  if(actor.human){if(!burstFollowup)G.viewWeapon.play('fire');G.kick+=weapon.recoil;G.recoil=Math.min(.16,G.recoil+weapon.recoil*.55);eventLog('shot',{weapon:item.id,ammo:item.ammo});}
  else actor.botRecoil=Math.min(.055,(actor.botRecoil||0)+weapon.recoil*.55);
  const fireSound=item.silenced===false?{m4a1:'m4a1_unsil-1',usp:'usp_unsil-1'}[item.id]||weapon.sound:weapon.sound;
  sound(fireSound,actor.human?null:actor.pos,1);
  const origin=eye(actor);
  const movement=Math.hypot(actor.vel.x,actor.vel.z)/250;
  let spread=weapon.spread+movement*.045+(actor.grounded?0:.09)+actor.accuracy*.008;
  if(actor.crouch)spread*=.65;
  if(item.id==='awp')spread=(actor.human?G.scope===0:!actor.botScoped)?.095:movement>.15?.035:.0008;
  if(!actor.human)spread+=({easy:.045,normal:.024,hard:.012}[G.difficulty]);
  const direction=forward(actor.yaw+(Math.random()-.5)*spread,actor.pitch+aimRecoil+(Math.random()-.5)*spread);
  actor.accuracy=Math.min(5,actor.accuracy+1);
  const range=isMelee(item.id)?alternate?32:48:weapon.slot===2?4096:8192;
  const wall=G.map.trace(origin,origin.clone().addScaledVector(direction,range),0);
  let closest=range*wall.fraction,hit=null,isHead=false;
  for(const target of [...G.actors,...G.hostages]) {
    if(target===actor||!target.alive||target.rescued)continue;
    const head=target.pos.clone().add(V(0,target.crouch?29:64,0));
    const headDistance=raySphere(origin,direction,head,8);
    const bodyDistance=rayBox(origin,direction,target.pos.clone().add(V(-14,5,-14)),target.pos.clone().add(V(14,target.crouch?29:57,14)));
    const distance=Math.min(headDistance,bodyDistance);
    if(distance<closest){closest=distance;hit=target;isHead=headDistance<bodyDistance;}
  }
  if(hit) {
    if(!actor.human&&G.difficulty==='easy')isHead=false;
    const point=origin.clone().addScaledVector(direction,closest);
    if(!hit.team)impact(point,true);
    if(hit.team) {
      const rangeModifier={ak47:.98,m4a1:item.silenced===false?.97:.95,awp:.99,deagle:.81,usp:.79,glock:.75}[item.id]||1;
      const backstab=alternate&&forward(actor.yaw).dot(forward(hit.yaw))>.8;
      const knifeDamage=alternate?(backstab?195:65):actor.lastKnife&&G.elapsed-actor.lastKnife<.8?15:20;
      const baseDamage=item.silenced===false?{m4a1:32,usp:34}[item.id]||weapon.damage:weapon.damage;
      const damage=isMelee(item.id)?knifeDamage:baseDamage*(isHead?4:1)*Math.pow(rangeModifier,closest/500);
      const hpBefore=hit.hp;damageActor(hit,damage,actor,item.id,isHead);
      if(hit.hp<hpBefore){addHitFlecks(point,isHead,!hit.alive);if(isHead)sound('headshot2',point,.5);}
    } else {
      hit.hp-=weapon.damage*(isHead?4:1);actor.money=Math.max(0,actor.money-150);if(hit.hp<=0){hit.alive=false;hit.owner=null;actor.money=Math.max(0,actor.money-1500);eventLog('hostage_killed',{id:hit.id});}
    }
  } else if(wall.hit){impact(wall.endPos);damageBreakable(wall.modelIndex,weapon.damage);if(isMelee(item.id))sound('knife_hitwall1',wall.endPos,.6);}
  if(isMelee(item.id))actor.lastKnife=G.elapsed;
  if(item.id==='awp'&&actor.human&&G.scope>0){actor.resumeScope=G.scope;actor.scopeTimer=1.45;G.scope=0;}
  if(item.id==='awp'&&!actor.human){actor.botScoped=false;actor.botStillAim=0;}
}
const grenadeGravity=500,grenadeFuse=1.7,grenadeChargeMs=1000;
let grenadePressedAt=null,throwHand=null;
function grenadeCharge(){return clamp((performance.now()-grenadePressedAt)/grenadeChargeMs,0,1);}
function cancelGrenadeAim(){
  if(grenadePressedAt!==null)G.viewWeapon?.play('idle');
  grenadePressedAt=null;
  if(throwHand){viewScene.remove(throwHand.model);throwHand.model.dispose();throwHand=null;}
}
function beginGrenadeAim(){
  if(grenadePressedAt!==null||G.phase==='ended'||!$('buy').classList.contains('hidden'))return;
  grenadePressedAt=performance.now();
  G.viewWeapon.primeGrenade();sound('pinpull',null,.6);
}
function grenadeLaunch(actor,power){
  const direction=forward(actor.yaw,clamp(actor.pitch+.12,-Math.PI/2,Math.PI/2));
  const origin=eye(actor),start=origin.clone().addScaledVector(direction,20);
  if(actor.human){
    start.x+=6*Math.cos(actor.yaw);start.z-=6*Math.sin(actor.yaw);start.y-=3;
  }
  const trace=G.map.trace(origin,start,0);
  const pos=trace.endPos.clone();
  if(trace.hit)pos.addScaledVector(trace.plane.normal,.5);
  const vel=direction.multiplyScalar(260+390*power).add(actor.vel);vel.y+=55+25*power;
  return {pos,vel};
}
function releaseGrenadeAim(){
  if(grenadePressedAt===null)return;
  const actor=G.player;
  if(G.state!=='playing'||G.phase!=='live'||!actor?.alive||actor.slot!==4||actor.inventory[4]?.id!=='he'){
    cancelGrenadeAim();return;
  }
  const power=grenadeCharge(),hand=G.viewWeapon;
  grenadePressedAt=null;
  hand.releaseGrenade();G.viewWeapon=null;
  throwGrenade(actor,power);
  throwHand={model:hand,remaining:.22};
}
function throwGrenade(actor,power=1) {
  if(actor.inventory[4]?.id!=='he')return;
  actor.cooldown=1;
  if(!actor.human)sound('pinpull',actor.pos,.6);
  const mesh=G.models.createWorldWeapon('he',actor.inventory[4]?.finish);
  const {pos,vel}=grenadeLaunch(actor,power);
  mesh.position.copy(pos);scene.add(mesh);
  G.grenades.push({mesh,pos,vel,timer:grenadeFuse,owner:actor.id});
  delete actor.inventory[4];
  const next=actor.inventory[1]?1:actor.inventory[2]?2:3;
  if(actor.human){setWeapon(next);eventLog('grenade_throw',{power});}else actor.slot=next;
}
const HE_BLAST_ATLAS='./assets/blast.webp';
// A Saltline-style pressure front and brief local illumination accompany the HE fire and smoke.
const activeBlasts=[];
const blastLightUniform={value:[new THREE.Vector4(),new THREE.Vector4()]};
const burstRingGeometry=new THREE.RingGeometry(.77,1,80);
const burstShellGeometry=new THREE.SphereGeometry(1,32,18);
let blastTextures=[];
async function loadBlastTextures(){
  const atlas=new Image();atlas.src=HE_BLAST_ATLAS;await atlas.decode();
  const cell=atlas.width/2;
  blastTextures=Array.from({length:4},(_,i)=>{
    const ctx=nightCanvas(384,384);
    ctx.drawImage(atlas,(i%2)*cell,Math.floor(i/2)*cell,cell,cell,0,0,384,384);
    // Fade away the tile edges even at the smallest mip levels.
    ctx.globalCompositeOperation='destination-in';
    const feather=ctx.createRadialGradient(192,192,142,192,192,192);
    feather.addColorStop(0,'white');feather.addColorStop(1,'transparent');
    ctx.fillStyle=feather;ctx.fillRect(0,0,384,384);
    return nightTexture(ctx);
  });
}
function burstSparks(parent,count){
  const pos=new Float32Array(count*6),colors=new Float32Array(count*6);
  const geo=new THREE.BufferGeometry(),attr=new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position',attr);geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;lines.renderOrder=4;parent.add(lines);
  const sparks=[],origin=parent.position.clone().add(new THREE.Vector3(0,5,0));
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2,flat=75+Math.random()*240;
    const v=new THREE.Vector3(Math.cos(angle)*flat,35+Math.random()*210,Math.sin(angle)*flat);
    const life=.28+Math.random()*.48;
    const end=origin.clone().addScaledVector(v,life);
    const trace=G.map.trace(origin,end,0);
    sparks.push({v,life:Math.max(.015,life*trace.fraction)});
    colors.set([1,.73,.28,.95,.18,.025],i*6);
  }
  return {lines,update(t){
    let live=0;
    for(const {v,life} of sparks){
      if(t>=life)continue;
      const tail=Math.max(0,t-.045),j=live++*6;
      pos[j]=v.x*t;pos[j+1]=5+v.y*t-135*t*t;pos[j+2]=v.z*t;
      pos[j+3]=v.x*tail;pos[j+4]=5+v.y*tail-135*tail*tail;pos[j+5]=v.z*tail;
    }
    geo.setDrawRange(0,live*2);lines.visible=live>0;attr.needsUpdate=true;
    mat.opacity=Math.max(0,1-t/.82);
  }};
}
function spawnBlast(position){
  if(activeBlasts.length>=4)disposeBlast(activeBlasts.shift());
  const group=new THREE.Group();group.name='HE detonation';group.position.copy(position);scene.add(group);
  const low=G.quality==='low',clouds=[];
  function cloud(tile,delay,life,radius,start,velocity,stretch=1){
    const mat=new THREE.SpriteMaterial({map:blastTextures[tile],transparent:true,depthWrite:false,rotation:(Math.random()-.5)*1.3});
    const mesh=new THREE.Sprite(mat);mesh.renderOrder=tile<2?3:2;mesh.visible=false;group.add(mesh);
    clouds.push({mesh,tile,delay,life,radius,start,velocity,stretch,angle:mat.rotation,spin:Math.random()*.6-.3});
  }
  cloud(0,0,.24,98,V(0,10,0),V(0,64,0));
  const count=low?3:5,phase=Math.random()*6.283;
  for(let i=0;i<count;i++){
    const angle=phase+i*2*Math.PI/count,c=Math.cos(angle),s=Math.sin(angle);
    cloud(1,.012+i*.018,.39+i*.026,76+Math.random()*30,V(c*8,8+s*4,s*8),V(c*67,58+i*18,s*67),1.08);
    if(i%2===0||!low)cloud(i%2===0?2:3,.09+i*.027,.85+i*.055,99+Math.random()*27,
      V(c*13,12,s*13),i%2===0?V(c*34,62+i*8,s*34):V(c*78,19,s*78),i%2===0?1.14:.64);
  }
  const shellMat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{strength:{value:0}},
    vertexShader:`varying vec3 vn;varying vec3 vv;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vn=normalMatrix*normal;vv=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float strength;varying vec3 vn;varying vec3 vv;void main(){
      float rim=1.-abs(dot(normalize(vn),normalize(vv)));
      gl_FragColor=vec4(.47,.34,.97,pow(rim,4.)*strength);
      #include <colorspace_fragment>
    }`
  });
  const shell=new THREE.Mesh(burstShellGeometry,shellMat);shell.position.y=5;group.add(shell);
  const down=G.map.trace(position.clone().add(V(0,3,0)),position.clone().add(V(0,-82,0)),0);
  let ring=null;
  if(down.hit&&!down.allSolid&&down.plane.normal.y>.42){
    const mat=new THREE.ShaderMaterial({
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{strength:{value:0}},
      vertexShader:`varying vec2 local;void main(){local=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float strength;varying vec2 local;void main(){
        float angle=atan(local.y,local.x), r=length(local);
        float wave=r-.91-.014*sin(7.*angle)-.009*sin(13.*angle);
        float line=exp(-95.*abs(wave)), dust=exp(-24.*abs(wave+.048));
        float breaks=.65+.35*sin(5.*angle+1.1)*sin(11.*angle);
        gl_FragColor=vec4(mix(vec3(1.,.35,.09),vec3(1.,.81,.51),line),strength*breaks*(line+.38*dust));
        #include <colorspace_fragment>
      }`
    });
    ring=new THREE.Mesh(burstRingGeometry,mat);
    ring.position.copy(down.endPos).sub(position).addScaledVector(down.plane.normal,1.3);
    ring.quaternion.setFromUnitVectors(V(0,0,1),down.plane.normal);group.add(ring);
  }
  const sparks=burstSparks(group,low?18:G.quality==='medium'?30:46);
  const blast={group,clouds,shell,ring,sparks,age:0};
  activeBlasts.push(blast);poseBlast(blast);syncBlastLights();
}
function poseBlast(blast){
  const t=blast.age;
  for(const p of blast.clouds){
    const age=t-p.delay,u=age/p.life,smoke=p.tile>=2;
    p.mesh.visible=u>=0&&u<1;if(!p.mesh.visible)continue;
    const expand=1-Math.pow(1-u,2.8), size=p.radius*(smoke?.30+.90*expand:.29+.81*expand);
    p.mesh.position.copy(p.start).addScaledVector(p.velocity,age/(1+.68*age));
    p.mesh.scale.set(size,size*p.stretch,1);p.mesh.material.rotation=p.angle+p.spin*age;
    const attack=p.tile===0?1:Math.min(1,u/(smoke?.22:.13));
    const fade=Math.min(1,(1-u)/(smoke?.68:.52));
    p.mesh.material.opacity=(smoke?(p.tile===2?.55:.32):.99)*attack*fade;
    if(smoke)p.mesh.material.color.setRGB(.85+.15*(1-u),.83-.24*(1-u),.90-.52*(1-u));
  }
  const u=Math.min(1,t/.34),ease=1-(1-u)*(1-u);
  blast.shell.visible=u<1;blast.shell.scale.setScalar(5+ease*119);
  blast.shell.material.uniforms.strength.value=.52*(1-u)*(1-u);
  if(blast.ring){
    const ground=Math.min(1,t/.41);blast.ring.visible=ground<1;
    blast.ring.scale.setScalar(8+154*(1-Math.pow(1-ground,2)));
    blast.ring.material.uniforms.strength.value=1.15*(1-ground)*(1-ground);
  }
  blast.sparks.update(t);
}
function syncBlastLights(){
  const lights=blastLightUniform.value;
  for(let i=0;i<lights.length;i++){
    const b=activeBlasts[activeBlasts.length-1-i];
    if(!b||b.age>.33){lights[i].w=0;continue;}
    const p=b.group.position;
    lights[i].set(p.x,p.y+16,p.z,1.9*Math.pow(1-b.age/.33,2));
  }
}
function disposeBlast(blast){
  scene.remove(blast.group);
  blast.group.traverse(o=>{if(o.material)o.material.dispose();});
  blast.sparks.lines.geometry.dispose();
}
function clearBlasts(){
  activeBlasts.forEach(disposeBlast);activeBlasts.length=0;syncBlastLights();
}
function updateBlasts(dt){
  if(!activeBlasts.length)return;
  for(let i=activeBlasts.length-1;i>=0;i--){
    const b=activeBlasts[i];b.age+=dt;
    if(b.age>=1.34){disposeBlast(b);activeBlasts.splice(i,1);}else poseBlast(b);
  }
  syncBlastLights();
}
function updateGrenades(dt) {
  for(let i=G.grenades.length-1;i>=0;i--) {
    const grenade=G.grenades[i];grenade.timer-=dt;grenade.vel.y-=grenadeGravity*dt;
    const trace=G.map.trace(grenade.pos,grenade.pos.clone().addScaledVector(grenade.vel,dt),0);
    grenade.pos.copy(trace.endPos);
    if(trace.hit){grenade.vel.reflect(trace.plane.normal).multiplyScalar(.5);grenade.pos.addScaledVector(trace.plane.normal,1);sound('he_bounce-1',grenade.pos,.4);}
    grenade.mesh.position.copy(grenade.pos);grenade.mesh.rotation.x+=dt*7;
    if(grenade.timer>0)continue;
    sound('hegrenade-1',grenade.pos,1.5);spawnBlast(grenade.pos);
    for(const actor of G.actors) {
      const distance=actor.pos.distanceTo(grenade.pos);
      if(distance<350&&lineClear(grenade.pos,eye(actor)))damageActor(actor,Math.max(0,110*(1-distance/350)),G.actors[grenade.owner],'he',false,grenade);
    }
    for(const brush of G.breakables||[]) {
      const distance=entityPosition(brush.entity).distanceTo(grenade.pos);
      if(distance<250)damageBreakable(brush.index,100*(1-distance/350));
    }
    if(G.player.pos.distanceTo(grenade.pos)<500)G.kick+=.06;
    scene.remove(grenade.mesh);grenade.mesh.dispose();G.grenades.splice(i,1);eventLog('grenade_explode');
  }
}

function createBombMesh(position) {
  const mesh=G.models.createWorldWeapon('c4');mesh.position.copy(position).y+=.2;
  const light=new THREE.Mesh(effectGeometry,bombLightMaterial);light.position.set(4,8,3);light.scale.setScalar(1.5);mesh.add(light);mesh.userData.flashLight=light;scene.add(mesh);return mesh;
}
function dropBomb(actor) {
  delete actor.inventory[5];G.bomb.carrier=null;G.bomb.pos.copy(actor.pos);G.bomb.progress=0;
  if(actor.alive) {
    const dropTrace=G.map.trace(center(actor),center(actor).addScaledVector(forward(actor.yaw),65),0);
    G.bomb.pos.copy(dropTrace.endPos).y=actor.pos.y;
    const floor=G.map.trace(G.bomb.pos.clone().add(V(0,18,0)),G.bomb.pos.clone().add(V(0,-500,0)),0);
    if(floor.hit)G.bomb.pos.y=floor.endPos.y+.3;
  }
  const mesh=createBombMesh(G.bomb.pos);G.drops.push({type:'c4',mesh,pos:G.bomb.pos.clone(),delay:actor.alive?.7:0});
  if(actor.human&&actor.slot===5)setWeapon(actor.inventory[1]?1:2);
  eventLog('bomb_dropped',{actor:actor.id});
}
function dropItem() {
  const actor=G.player;if(!actor?.alive)return;
  if(actor.slot===5){dropBomb(actor);return;}
  if(actor.slot>2)return;
  const item=actor.inventory[actor.slot];
  const mesh=G.models.createWorldWeapon(item.id,item.finish);mesh.position.copy(actor.pos).y+=.2;scene.add(mesh);
  G.drops.push({type:'weapon',item,mesh,pos:actor.pos.clone(),delay:1});delete actor.inventory[actor.slot];setWeapon(actor.inventory[2]?2:3);
}
function siteAt(actor) {
  return G.sites.find(site=>site.entity.bounds?inBounds(actor.pos.clone().add(V(0,20,0)),site.entity.bounds,8):actor.pos.distanceTo(site.pos)<128);
}
function plant(actor,dt) {
  if(G.bomb.carrier!==actor.id||G.bomb.planted||!siteAt(actor)||!actor.grounded){actor.taskProgress=0;return false;}
  if(actor.taskProgress===0){sound('c4_plant',actor.human?null:actor.pos,.6);if(actor.human)G.viewWeapon.play('fire');}
  actor.taskProgress+=dt;actor.vel.x=actor.vel.z=0;
  if(actor.human)G.task={text:'正在安放 C4',value:actor.taskProgress/3};
  if(actor.taskProgress<3)return true;
  G.bomb.planted=true;G.bomb.carrier=null;G.bomb.pos.copy(actor.pos);G.bomb.timer=35;G.bomb.progress=0;
  G.bomb.mesh=createBombMesh(G.bomb.pos);G.drops.push({type:'planted',mesh:G.bomb.mesh,pos:G.bomb.pos.clone()});
  delete actor.inventory[5];actor.money=Math.min(16000,actor.money+300);actor.taskProgress=0;
  if(actor.human)setWeapon(actor.inventory[1]?1:2);else actor.slot=1;
  announce('炸弹已安放',3);sound('bombpl');eventLog('bomb_planted',{actor:actor.id,site:siteAt(actor)?.name});return true;
}
function defuse(actor,dt) {
  if(!G.bomb.planted||actor.team!=='CT'||actor.pos.distanceTo(G.bomb.pos)>90||!lineClear(eye(actor),G.bomb.pos.clone().add(V(0,8,0))))return false;
  if(G.bomb.defuser!==null&&G.bomb.defuser!==actor.id)return false;
  if(G.bomb.defuser===null)sound('c4_disarm',G.bomb.pos,.7);
  G.bomb.defuser=actor.id;G.bomb.defuse+=dt;G.bomb.lastDefuse=G.elapsed;
  if(actor.human||viewedActor()===actor)G.task={text:actor.kit?'正在拆弹 · 拆弹器':'正在拆弹',value:G.bomb.defuse/(actor.kit?5:10)};
  if(G.bomb.defuse>=(actor.kit?5:10)) {
    G.bomb.planted=false;actor.money=Math.min(16000,actor.money+300);sound('bombdef');eventLog('bomb_defused',{actor:actor.id});endRound('CT','炸弹已拆除');
  }
  return true;
}
function rescuePosition() {
  const rescue=G.rescues[0];
  if(rescue)return entityPosition(rescue);
  return entityPosition(G.spawnCT[0]).add(V(0,-36,0));
}
function atRescue(hostage) {
  if(G.rescues.length)return G.rescues.some(e=>e.bounds?inBounds(hostage.pos.clone().add(V(0,20,0)),e.bounds,20):hostage.pos.distanceTo(entityPosition(e))<180);
  return G.spawnCT.some(e=>{
    const origin=entityPosition(e);
    return distanceFlat(hostage.pos,origin)<220&&Math.abs(hostage.pos.y-(origin.y-36))<80;
  });
}
function useHostage(actor) {
  if(actor.team!=='CT')return;
  const origin=eye(actor),direction=forward(actor.yaw,actor.pitch);
  const candidates=G.hostages.filter(h=>h.alive&&!h.rescued&&h.pos.distanceTo(actor.pos)<105&&lineClear(origin,h.pos.clone().add(V(0,45,0))));
  const alignment=hostage=>direction.dot(hostage.pos.clone().add(V(0,40,0)).sub(origin).normalize());
  const hostage=actor.human?candidates.filter(h=>alignment(h)>.3).sort((a,b)=>alignment(b)-alignment(a))[0]:
    candidates.filter(h=>h.owner===null).sort((a,b)=>a.pos.distanceToSquared(actor.pos)-b.pos.distanceToSquared(actor.pos))[0];
  if(!hostage)return;
  hostage.owner=hostage.owner===actor.id?null:actor.id;hostage.path=[];hostage.pathTime=0;
  if(hostage.owner!==null) {
    sound('hos1',actor.human?null:actor.pos,.7);
    if(!hostage.rewarded){actor.money=Math.min(16000,actor.money+150);hostage.rewarded=true;}
  }
  if(actor.human)hint(hostage.owner!==null?'人质正在跟随你':'人质原地等待',2);
  eventLog('hostage_use',{actor:actor.id,hostage:hostage.id,following:hostage.owner!==null});
}
function resetDoors() {
  for(const door of G.doors||[]) {
    door.amount=0;door.openUntil=0;door.group.position.copy(door.base);door.group.rotation.y=0;
    G.map.setModelEnabled(door.index,true,true);
  }
}
function resetBreakables() {
  for(const brush of G.breakables||[]){brush.health=brush.initialHealth;G.map.setModelEnabled(brush.index,true,true);}
}
function damageBreakable(index,damage) {
  const brush=G.breakables?.find(entry=>entry.index===index);
  if(!brush||brush.health<=0||Number(brush.entity.spawnflags||0)&1)return false;
  brush.health-=damage;
  if(brush.health>0)return false;
  G.map.setModelEnabled(index,false,false);sound('ric_conc-1',entityPosition(brush.entity),.7);
  eventLog('brush_broken',{model:index});return true;
}
function useDoor(actor) {
  const door=G.doors?.find(d=>actor.pos.clone().add(V(0,36,0)).distanceTo(entityPosition(d.entity))<125);
  if(door){door.openUntil=G.elapsed+5;return true;}
  return false;
}
function updateDoors(dt) {
  const movers=G.actors.concat(G.hostages.filter(hostage=>hostage.alive&&!hostage.rescued&&hostage.owner!==null));
  for(const door of G.doors||[]) {
    const close=movers.some(a=>a.alive&&inBounds(center(a),door.entity.bounds,75));
    if(close&&movers.some(a=>a.alive&&!a.human&&inBounds(center(a),door.entity.bounds,80)))door.openUntil=G.elapsed+4;
    const target=G.elapsed<door.openUntil||close&&door.amount>0?1:0;
    door.amount+=clamp(target-door.amount,-dt*2,dt*2);
    G.map.setModelEnabled(door.index,door.amount<.01,true);
    if(door.entity.classname==='func_door_rotating')door.group.rotation.y=door.amount*Number(door.entity.distance||90)*Math.PI/180;
    else door.group.position.copy(door.base).addScaledVector(door.direction,door.distance*door.amount);
  }
}
function followHostagePath(actor,goal,dt,speed=1) {
  actor.pathTime-=dt;
  if(actor.pathTime<=0||!actor.goal||actor.goal.distanceTo(goal)>120) {
    actor.path=G.nav.path(actor.pos,goal);actor.pathTime=30;actor.goal=goal.clone();
  }
  while(actor.path.length) {
    const next=actor.path[0];
    if(distanceFlat(actor.pos,next.pos)>12||Math.abs(actor.pos.y-next.pos.y)>(next.ladder?22:20))break;
    actor.path.shift();
  }
  const next=actor.path[0];
  if(!next) {
    const flat=goal.clone().sub(actor.pos);flat.y=0;
    if(flat.length()>25&&lineClear(center(actor),goal.clone().add(V(0,actor.crouch?18:36,0))))moveActor(actor,flat.normalize(),dt,{slow:speed});
    else moveActor(actor,V(),dt);
    return;
  }
  const direction=next.pos.clone().sub(actor.pos),rise=direction.y;direction.y=0;
  const flatDistance=direction.length();
  if(flatDistance>1){actor.yaw=Math.atan2(-direction.x,-direction.z);actor.pitch=0;}
  const climbing=next.ladder&&flatDistance<35;
  const jump=!climbing&&actor.grounded&&((rise>20&&flatDistance<55)||(next.jump&&flatDistance<55));
  moveActor(actor,direction.normalize(),dt,{crouch:next.crouch,ladder:climbing,ladderDirection:Math.sign(rise)||1,slow:speed,jump});
  actor.stuckTime=(actor.stuckTime||0)+dt;
  if(actor.stuckTime>1) {
    if(actor.pos.distanceTo(actor.lastPos)<10) {
      actor.pathTime=0;
      if(actor.grounded&&!next.crouch){actor.vel.y=268;actor.grounded=false;}
    }
    actor.lastPos.copy(actor.pos);actor.stuckTime=0;
  }
}


function navigationProbe(actor,direction,distance,crouch) {
  const height=crouch?18:36,hullIndex=crouch?3:1;
  const start=actor.pos.clone().add(V(0,height,0));
  const target=start.clone().addScaledVector(direction,distance);
  let trace=G.map.trace(start,target,hullIndex);
  if(trace.fraction<.99&&actor.grounded) {
    const up=G.map.trace(start,start.clone().add(V(0,18.1,0)),hullIndex);
    trace=G.map.trace(up.endPos,up.endPos.clone().addScaledVector(direction,distance),hullIndex);
  }
  if(trace.fraction<.99||trace.allSolid)return false;
  const floor=G.map.trace(trace.endPos,trace.endPos.clone().add(V(0,-64,0)),hullIndex);
  return floor.hit&&!floor.allSolid&&floor.plane.normal.y>.65&&floor.endPos.y>=start.y-38;
}
function navigationSteer(actor,direction,next,state) {
  if(next?.ladder||!actor.grounded)return direction;
  const crouch=!!next?.crouch||actor.crouch;
  let crowded=false;
  const avoidance=V();
  const neighbors=actor.inventory?G.actors:G.actors.concat(G.hostages);
  for(const mate of neighbors) {
    if(mate===actor||!mate.alive||mate.rescued||Math.abs(mate.pos.y-actor.pos.y)>42)continue;
    const offset=actor.pos.clone().sub(mate.pos);offset.y=0;
    const distance=offset.length();
    if(distance<1||distance>72)continue;
    const ahead=mate.pos.clone().sub(actor.pos).dot(direction);
    if(ahead<-12)continue;
    crowded=true;
    avoidance.addScaledVector(offset.normalize(),(72-distance)/72);
  }
  const forwardClear=navigationProbe(actor,direction,30,crouch);
  if(!crowded&&forwardClear&&state.stalled<.6)return direction;
  const side=V(-direction.z,0,direction.x);
  const preferred=state.side;
  const candidates=[
    direction.clone().multiplyScalar(.7).addScaledVector(side,preferred).add(avoidance).normalize(),
    direction.clone().multiplyScalar(.7).addScaledVector(side,-preferred).add(avoidance).normalize(),
    side.clone().multiplyScalar(preferred),
    side.clone().multiplyScalar(-preferred)
  ];
  for(const candidate of candidates) {
    if(navigationProbe(actor,candidate,34,crouch))return candidate;
  }
  return direction;
}
function followPath(actor,goal,dt,speed=1) {
  if(!actor.team){followHostagePath(actor,goal,dt,speed);return;}
  if(!actor.navState||actor.navState.round!==G.round) {
    const seed=(actor.id||0)*17+G.round*29+(actor.owner||0)*7+Math.floor((G.aiSeed||0)*997);
    actor.navState={round:G.round,seed,side:seed%2?1:-1,failures:new Map(),stalled:0,bestDistance:Infinity,target:null,departAt:G.elapsed+(actor.team&&!actor.human?(actor.id%5)*.18:0)};
  }
  const state=actor.navState;
  const arrivalRadius=actor.botAction==='approach-bomb'?10:32;
  if(distanceFlat(actor.pos,goal)<arrivalRadius&&Math.abs(actor.pos.y-goal.y)<25&&lineClear(center(actor),goal.clone().add(V(0,actor.crouch?18:36,0)))) {
    actor.path=[];state.stalled=0;state.arrived=true;moveActor(actor,V(),dt);return;
  }
  state.arrived=false;
  if(G.elapsed<state.departAt){moveActor(actor,V(),dt);return;}
  actor.pathTime-=dt;
  if(actor.pathTime<=0||!actor.goal||actor.goal.distanceTo(goal)>110) {
    actor.path=G.nav.path(actor.pos,goal,actor);actor.pathTime=24;actor.goal=goal.clone();
    state.target=null;state.stalled=0;state.bestDistance=Infinity;
  }
  while(actor.path.length) {
    const next=actor.path[0];
    if(distanceFlat(actor.pos,next.pos)>13||Math.abs(actor.pos.y-next.pos.y)>(next.ladder?22:20))break;
    actor.path.shift();state.target=null;state.stalled=0;state.bestDistance=Infinity;
  }
  const next=actor.path[0];
  if(!next) {
    const flat=goal.clone().sub(actor.pos);flat.y=0;
    if(flat.length()>arrivalRadius&&lineClear(center(actor),goal.clone().add(V(0,actor.crouch?18:36,0)))) {
      const wish=navigationSteer(actor,flat.normalize(),null,state);
      moveActor(actor,wish,dt,{slow:speed});
    } else {
      moveActor(actor,V(),dt);
      state.stalled+=dt;
      actor.pathTime=Math.min(actor.pathTime,.65);
      if(state.stalled>2) {
        actor.botRouteBlockedUntil=G.elapsed+3;
        state.side=-state.side;
        const toward=goal.clone().sub(actor.pos);toward.y=0;toward.normalize();
        moveActor(actor,navigationSteer(actor,toward,null,state),dt,{slow:speed});
      }
    }
    return;
  }
  const targetKey=next.nodeId===undefined?next.pos.toArray().join(','):next.nodeId;
  const distance=actor.pos.distanceTo(next.pos);
  if(state.target!==targetKey){state.target=targetKey;state.bestDistance=distance;state.stalled=0;}
  if(distance<state.bestDistance-5){state.bestDistance=distance;state.stalled=0;}
  else state.stalled+=dt;
  const direction=next.pos.clone().sub(actor.pos),rise=direction.y;direction.y=0;
  const flatDistance=direction.length();
  const climbing=next.ladder&&flatDistance<35;
  const wish=navigationSteer(actor,direction.normalize(),next,state);
  if(direction.lengthSq()>.01)faceBotDirection(actor,direction,dt);
  const jump=!climbing&&actor.grounded&&((rise>20&&flatDistance<55)||(next.jump&&flatDistance<55));
  moveActor(actor,wish,dt,{crouch:next.crouch,ladder:climbing,ladderDirection:Math.sign(rise)||1,slow:speed,jump});
  if(state.stalled>1.8&&!climbing) {
    if(next.fromNode!==undefined&&next.nodeId!==undefined) {
      const key=next.fromNode+':'+next.nodeId;
      const previous=state.failures.get(key);
      const count=(previous?.count||0)+1;
      state.failures.set(key,{until:G.elapsed+Math.min(60,12*count),count});
    }
    state.side=-state.side;actor.pathTime=0;state.stalled=0;
    if(actor.grounded&&!next.crouch){actor.vel.y=225;actor.grounded=false;}
  }
  actor.lastPos.copy(actor.pos);
}


function updateHostages(dt) {
  for(const hostage of G.hostages) {
    if(!hostage.alive){hostage.mesh.update(dt,{dead:true});continue;}
    if(hostage.rescued)continue;
    const owner=G.actors.find(a=>a.id===hostage.owner&&a.alive);
    if(owner) {
      if(hostage.pos.distanceTo(owner.pos)>75)followPath(hostage,owner.pos,dt,.78);
      else moveActor(hostage,V(),dt);
      if(atRescue(hostage)) {
        hostage.rescued=true;hostage.mesh.visible=false;owner.money=Math.min(16000,owner.money+1000);sound('rescue');eventLog('hostage_rescued',{hostage:hostage.id,actor:owner.id});
        if(G.hostages.filter(h=>h.alive).every(h=>h.rescued))endRound('CT','人质已全部获救');
      }
    } else {hostage.owner=null;moveActor(hostage,V(),dt);}
    hostage.mesh.position.copy(hostage.pos);hostage.mesh.rotation.y=hostage.yaw===undefined?0:hostage.yaw+Math.PI/2;
    hostage.mesh.update(dt,{moving:hostage.vel.length()>10,crouch:hostage.crouch});
  }
}
function updateObjectives(dt) {
  for(let i=G.drops.length-1;i>=0;i--) {
    const drop=G.drops[i];drop.delay=Math.max(0,(drop.delay||0)-dt);
    if(drop.type==='planted'||drop.delay)continue;
    const actor=G.actors.find(a=>a.alive&&(drop.type!=='c4'||a.team==='T')&&a.pos.distanceTo(drop.pos)<45&&(drop.type==='c4'||a.human&&!a.inventory[WEAPONS[drop.item.id].slot]));
    if(!actor)continue;
    if(drop.type==='c4'){G.bomb.carrier=actor.id;actor.inventory[5]=freshWeapon('c4');eventLog('bomb_picked',{actor:actor.id});if(actor.human)hint('你拾取了 C4',2);}
    else{actor.inventory[WEAPONS[drop.item.id].slot]=drop.item;if(actor.human)setWeapon(WEAPONS[drop.item.id].slot);}
    scene.remove(drop.mesh);drop.mesh.dispose?.();G.drops.splice(i,1);
  }
  if(G.bomb.planted) {
    const before=Math.floor(G.bomb.timer);G.bomb.timer-=dt;
    if(Math.floor(G.bomb.timer)!==before)sound('c4_beep1',G.bomb.pos,1);
    if(G.bomb.mesh)G.bomb.mesh.userData.flashLight.visible=Math.sin(G.elapsed*(G.bomb.timer<10?14:7))>0;
    if(G.bomb.defuser!==null&&G.elapsed-(G.bomb.lastDefuse||0)>.08){G.bomb.defuser=null;G.bomb.defuse=0;}
    if(G.bomb.timer<=0) {
      sound('c4_explode1',G.bomb.pos,2);G.flash=1;
      for(const actor of G.actors)if(actor.alive&&actor.pos.distanceTo(G.bomb.pos)<1100)damageActor(actor,500*(1-actor.pos.distanceTo(G.bomb.pos)/1100),null,'c4');
      G.bomb.planted=false;eventLog('bomb_exploded');endRound('T','目标已被摧毁');
    }
  }
  if(G.mapName==='cs_assault')updateHostages(dt);
}

function faceBotDirection(actor,direction,dt) {
  if(direction.lengthSq()<.01)return;
  const desired=Math.atan2(-direction.x,-direction.z);
  const error=Math.atan2(Math.sin(desired-actor.yaw),Math.cos(desired-actor.yaw));
  actor.yaw+=clamp(error,-dt*2.6,dt*2.6);
  const pitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
  actor.pitch+=clamp(pitch-actor.pitch,-dt*1.8,dt*1.8);
}
function botTactics(actor) {
  if(!actor.botTactics||actor.botTactics.round!==G.round) {
    const members=G.actors.filter(member=>member.team===actor.team).sort((a,b)=>a.id-b.id);
    const rank=Math.max(0,members.findIndex(member=>member.id===actor.id));
    const seed=Math.floor((G.aiSeed||0)*997)+actor.id*31+G.round*17;
    actor.botTactics={round:G.round,rank,variant:seed%3,points:new Map(),mission:null,stage:0,stageStarted:G.elapsed};
  }
  return actor.botTactics;
}
function botPositionNear(actor,desired,purpose,radius=250) {
  const tactics=botTactics(actor);
  const cached=tactics.points.get(purpose);
  if(cached&&cached.source.distanceToSquared(desired)<80*80)return cached.position.clone();
  let best=null,bestScore=Infinity;
  for(const area of G.nav.areas) {
    const index=area.node,node=G.nav.nodes[index];
    if(!node||node.crouch||G.nav.blocked.has(index)||!node.links.length)continue;
    const flat=distanceFlat(node.p,desired),height=Math.abs(node.p.y-desired.y);
    if(flat>radius||height>65)continue;
    const score=flat*flat+height*height*4;
    if(score<bestScore){best=node.p;bestScore=score;}
  }
  const position=best?best.clone():G.nav.nodes[G.nav.nearest(desired)]?.p.clone()||desired.clone();
  tactics.points.set(purpose,{source:desired.clone(),position});
  return position.clone();
}
function botStagedGoal(actor,destination,waypoints,mission) {
  const tactics=botTactics(actor);
  if(tactics.mission!==mission) {
    tactics.mission=mission;tactics.stage=0;tactics.stageStarted=G.elapsed;
  }
  while(tactics.stage<waypoints.length) {
    const raw=V(...waypoints[tactics.stage]);
    const waypoint=botPositionNear(actor,raw,mission+'-'+tactics.stage,300);
    const reached=distanceFlat(actor.pos,waypoint)<110&&Math.abs(actor.pos.y-waypoint.y)<75;
    if(reached||G.elapsed-tactics.stageStarted>20||actor.botRouteBlockedUntil>G.elapsed) {
      tactics.stage++;tactics.stageStarted=G.elapsed;
      actor.botRouteBlockedUntil=0;
    } else return waypoint;
  }
  return destination.clone();
}
function botGuardPosition(actor,objective,purpose,distance=145) {
  const tactics=botTactics(actor);
  const angle=(tactics.rank*1.83+tactics.variant*.7+G.round*.4);
  const desired=objective.clone().add(V(Math.cos(angle)*distance,0,Math.sin(angle)*distance));
  return botPositionNear(actor,desired,purpose,260);
}
function botPatrolPosition(actor,anchors,purpose) {
  const tactics=botTactics(actor);
  if(!tactics.patrol||tactics.patrol.purpose!==purpose) {
    tactics.patrol={purpose,index:(tactics.rank+tactics.variant)%anchors.length,heldSince:null};
  }
  const patrol=tactics.patrol;
  let point=botPositionNear(actor,V(...anchors[patrol.index]),purpose+'-'+patrol.index,260);
  if(distanceFlat(actor.pos,point)<60&&Math.abs(actor.pos.y-point.y)<35) {
    if(patrol.heldSince===null)patrol.heldSince=G.elapsed;
    if(G.elapsed-patrol.heldSince>11+tactics.rank*1.7) {
      patrol.index=(patrol.index+1)%anchors.length;patrol.heldSince=null;
      point=botPositionNear(actor,V(...anchors[patrol.index]),purpose+'-'+patrol.index,260);
      actor.pathTime=0;
    }
  } else patrol.heldSince=null;
  return point;
}
function updateBotGuardLook(actor,dt) {
  if(!actor.navState?.arrived)return;
  const tactics=botTactics(actor);
  let watch;
  if(G.mapName==='de_dust2') {
    if(G.bomb.planted)watch=entityPosition(actor.team==='CT'?G.spawnT[0]:G.spawnCT[0]);
    else if(actor.pos.x<0)watch=V(-1725,actor.pos.y,-1750);
    else watch=tactics.rank%2?V(450,96,-1950):V(1400,0,-1650);
  } else watch=actor.pos.y>250?V(-350,128,-2300):V(650,32,-2200);
  const direction=watch.sub(actor.pos);direction.y=0;
  const scan=Math.sin((G.elapsed+tactics.rank)*.35)*.48;
  direction.applyAxisAngle(V(0,1,0),scan);
  faceBotDirection(actor,direction,dt);
}
function botGoal(actor) {
  const tactics=botTactics(actor),rank=tactics.rank;
  if(G.mapName==='de_dust2') {
    if(G.bomb.planted) {
      if(actor.team==='CT') {
        const plan=botDefusePlan();
        if(plan?.actorId===actor.id)return plan.point.clone();
      }
      return botGuardPosition(actor,G.bomb.pos,'planted-cover',actor.team==='CT'?160:210);
    }
    if(actor.team==='T') {
      if(G.bomb.carrier===null) {
        const picker=G.actors.filter(member=>member.alive&&member.team==='T').sort((a,b)=>a.pos.distanceToSquared(G.bomb.pos)-b.pos.distanceToSquared(G.bomb.pos))[0];
        return picker===actor?G.bomb.pos.clone():botGuardPosition(actor,G.bomb.pos,'dropped-cover',150);
      }
      const carrier=G.actors.find(member=>member.id===G.bomb.carrier&&member.alive);
      const mainSite=G.sites[G.round%G.sites.length];
      const split=rank===3&&G.bomb.carrier!==actor.id;
      const site=split?G.sites[(G.round+1)%G.sites.length]:mainSite;
      if(carrier?.human&&carrier!==actor&&rank===1) {
        const spawn=entityPosition(G.spawnT[0]);
        if(distanceFlat(carrier.pos,spawn)>400)return botGuardPosition(actor,carrier.pos,'carrier-cover',130);
      }
      const variant=(rank+tactics.variant)%3;
      const routes=site.name==='A'?[
        [[1125,0,-900]],
        [[-125,0,-850],[500,96,-1975]],
        [[450,0,-350],[1400,0,-1700]]
      ]:[
        [[-1850,0,-1050]],
        [[-125,0,-1150],[-1000,0,-2200]],
        [[-1500,128,550],[-1800,0,-1400]]
      ];
      const destination=G.bomb.carrier===actor.id?site.pos:botGuardPosition(actor,site.pos,'attack-'+site.name,rank%2?95:170);
      return botStagedGoal(actor,destination,routes[variant],'attack-'+site.name);
    }
    const site=G.sites[(rank+G.round)%G.sites.length];
    const anchors=site.name==='A'?[[1060,96,-2350],[1450,0,-1900],[500,96,-2000]]:[[-1450,0,-2500],[-1050,0,-2300],[-1650,0,-2150]];
    return botPatrolPosition(actor,anchors,'defend-'+site.name);
  }
  const available=G.hostages.filter(hostage=>hostage.alive&&!hostage.rescued);
  if(actor.team==='CT') {
    if(available.some(hostage=>hostage.owner===actor.id))return rescuePosition();
    const free=available.filter(hostage=>hostage.owner===null).sort((a,b)=>a.id-b.id);
    if(!free.length)return botGuardPosition(actor,rescuePosition(),'rescue-cover',140);
    let hostage=free.find(hostage=>hostage.id===tactics.assignedHostage);
    if(!hostage) {
      const claimed=new Set(G.actors.filter(member=>member!==actor&&member.alive&&member.team===actor.team).map(member=>member.botTactics?.assignedHostage));
      const unclaimed=free.filter(hostage=>!claimed.has(hostage.id));
      const choices=unclaimed.length?unclaimed:free;
      hostage=choices[(rank+G.round)%choices.length];
      tactics.assignedHostage=hostage.id;
    }
    const routes=[
      [[650,0,-2100]],
      [[-900,0,-1950]],
      [[-1100,0,-1750]],
      [[600,32,-2600]]
    ];
    return botStagedGoal(actor,hostage.pos,routes[(rank+tactics.variant)%routes.length],'hostage-'+hostage.id);
  }
  const posts=[[-925,336,-2425],[-775,336,-2687],[-287,128,-2550],[650,32,-2300],[-600,128,-2312]];
  return botPatrolPosition(actor,posts,'hostage-defense');
}

function defusePositionVisible(position, crouch = false) {
  if (position.distanceTo(G.bomb.pos) > 88) return false;
  const sight = position.clone().add(V(0, crouch ? 28 : 64, 0));
  return lineClear(sight, G.bomb.pos.clone().add(V(0, 8, 0)));
}

function bombInteractionPoints() {
  const points = [];
  const bomb = G.bomb.pos;
  for (const radius of [32, 48, 64]) {
    for (let step = 0; step < 12; step++) {
      const angle = step * Math.PI / 6;
      const start = bomb.clone().add(V(Math.cos(angle) * radius, 74, Math.sin(angle) * radius));
      const floor = G.map.trace(start, start.clone().add(V(0, -145, 0)), 1);
      if (!floor.hit || floor.allSolid || floor.plane.normal.y < .65) continue;
      const point = floor.endPos.clone().add(V(0, -35.9, 0));
      if (Math.abs(point.y - bomb.y) > 32 || !defusePositionVisible(point)) continue;
      points.push(point);
    }
  }
  for (const area of G.nav.areas) {
    const point = G.nav.nodes[area.node].p;
    if (Math.abs(point.y - bomb.y) <= 28 && defusePositionVisible(point)) points.push(point.clone());
  }
  return points;
}

function botDefusePlan() {
  if (!G.bomb.planted) return null;
  const human = G.player;
  if (human.alive && G.bomb.defuser === human.id) {
    return {actorId: human.id, point: human.pos};
  }
  const existing = G.bomb.botPlan;
  if (existing) {
    const actor = G.actors.find(candidate => candidate.id === existing.actorId && candidate.alive);
    if (actor && !actor.human && G.elapsed - existing.lastProgress < 6) {
      if (actor.pos.distanceTo(existing.progressPosition) > 20 || defusePositionVisible(actor.pos, actor.crouch)) {
        existing.progressPosition.copy(actor.pos);
        existing.lastProgress = G.elapsed;
      }
      return existing;
    }
    if(actor) {
      G.bomb.failedInteractionPoints=G.bomb.failedInteractionPoints||new Set();
      G.bomb.failedInteractionPoints.add(existing.point.toArray().map(Math.round).join(','));
    }
    G.bomb.botPlan = null;
  }
  if (G.bomb.planRetryAt > G.elapsed) return null;
  G.bomb.planRetryAt = G.elapsed + .7;
  const candidates = G.actors.filter(actor => actor.alive && actor.team === 'CT' && !actor.human);
  candidates.sort((a, b) => a.pos.distanceTo(G.bomb.pos) + (a.kit ? 0 : 240) - b.pos.distanceTo(G.bomb.pos) - (b.kit ? 0 : 240));
  const points = G.bomb.interactionPoints || (G.bomb.interactionPoints = bombInteractionPoints());
  for (const actor of candidates) {
    let selected = defusePositionVisible(actor.pos, actor.crouch) ? actor.pos.clone() : null;
    if (!selected) {
      const ordered = points.slice().sort((a, b) => a.distanceToSquared(actor.pos) - b.distanceToSquared(actor.pos));
      for (const point of ordered.slice(0, 14)) {
        const pointKey=point.toArray().map(Math.round).join(',');
        if(G.bomb.failedInteractionPoints?.has(pointKey))continue;
        const route = G.nav.path(actor.pos, point, actor, 'direct');
        const last = route.at(-1)?.pos || actor.pos;
        if (distanceFlat(last, point) > 105 || Math.abs(last.y - point.y) > 35) continue;
        const direction=point.clone().sub(last);direction.y=0;
        const distance=direction.length();
        if(distance>8&&!navigationProbe({pos:last,crouch:false,grounded:true},direction.normalize(),distance,false))continue;
        selected = point.clone();
        break;
      }
    }
    if (!selected) continue;
    const plan = {actorId: actor.id, point: selected, lastProgress: G.elapsed, progressPosition: actor.pos.clone(), combatUntil: G.elapsed + 1};
    G.bomb.botPlan = plan;
    actor.pathTime = 0;
    actor.botAction = 'approach-bomb';
    eventLog('bot_defuse_assigned', {actor: actor.id, point: selected.toArray()});
    return plan;
  }
  return null;
}

function updateBotBombTask(actor, enemy, dt) {
  if (!G.bomb.planted || actor.team !== 'CT') return false;
  const plan = botDefusePlan();
  if (!plan || plan.actorId !== actor.id) return false;
  const duration = actor.kit ? 5 : 10;
  const urgent = G.bomb.timer < duration + 5 || G.bomb.defuser === actor.id;
  if (!urgent && enemy && actor.pos.distanceTo(enemy.pos) < 450 && G.elapsed < plan.combatUntil) return false;
  if (defusePositionVisible(actor.pos, actor.crouch)) {
    actor.botAction = 'defusing';
    moveActor(actor, V(), dt);
    const difference = G.bomb.pos.clone().sub(eye(actor));
    faceBotDirection(actor, difference, dt);
    if (defuse(actor, dt)) return true;
  }
  actor.botAction = 'approach-bomb';
  followPath(actor, plan.point, dt);
  return true;
}

function chooseBotAimError(actor) {
  const tuning = BOT_TUNING[G.difficulty];
  const miss = Math.random() > tuning.centerAimChance;
  const side = Math.random() < .5 ? -1 : 1;
  actor.botAimOffset = {
    horizontal: miss ? side * (24 + Math.random() * 20) : (Math.random() - .5) * 10,
    vertical: (Math.random() - .5) * 5
  };
  actor.botAimBias = [(Math.random() - .5) * tuning.aimError, (Math.random() - .5) * tuning.aimError];
}

function botAimPosition(actor, enemy, dt) {
  const tuning = BOT_TUNING[G.difficulty];
  const height = enemy.crouch ? tuning.crouchAim : tuning.bodyAim;
  const target = enemy.pos.clone().add(V(0, height, 0));
  const headBlend = actor.botHeadIntent ? clamp((actor.botAimTime - tuning.headDelay) * 1.5, 0, 1) : 0;
  target.lerp(eye(enemy), headBlend);
  const forwardToEnemy = enemy.pos.clone().sub(actor.pos);
  forwardToEnemy.y = 0;
  forwardToEnemy.normalize();
  const right = V(-forwardToEnemy.z, 0, forwardToEnemy.x);
  const error = actor.botAimOffset || {horizontal: 0, vertical: 0};
  target.addScaledVector(right, error.horizontal).y += error.vertical;
  if (!actor.botTrackedAim) actor.botTrackedAim = target.clone();
  actor.botTrackedAim.lerp(target, 1 - Math.exp(-dt * tuning.tracking));
  return actor.botTrackedAim.clone();
}

function easyAttackOwner(enemy) {
  const assigned = G.actors.find(candidate => candidate.id === enemy.easyAttackerId);
  const active = assigned?.alive && assigned.target === enemy.id && assigned.botAction === 'combat'
    && lineClear(eye(assigned), eye(enemy));
  return active ? assigned : null;
}

function botMayFireAt(actor, enemy) {
  if (G.difficulty !== 'easy') return true;
  const assigned = easyAttackOwner(enemy);
  if (assigned) return assigned === actor;
  enemy.easyAttackerId = actor.id;
  actor.botTriggerWait = Math.max(actor.botTriggerWait || 0, .25 + Math.random() * .2);
  return false;
}

function thinkBot(actor) {
  const tuning=BOT_TUNING[G.difficulty],sight=eye(actor),heading=forward(actor.yaw);
  const visible=G.actors.filter(other=>{
    if(!other.alive||other.team===actor.team)return false;
    const difference=other.pos.clone().sub(actor.pos),distance=difference.length();
    if(distance>2200)return false;
    difference.y=0;
    const aware=actor.lastAttacker===other.id&&actor.awarenessUntil>G.elapsed;
    if(!aware&&heading.dot(difference.normalize())<Math.cos(tuning.halfFov*Math.PI/180))return false;
    return lineClear(sight,other.pos.clone().add(V(0,other.crouch?22:44,0)))||lineClear(sight,eye(other));
  });
  visible.sort((a,b)=>a.pos.distanceToSquared(actor.pos)-b.pos.distanceToSquared(actor.pos));
  const next=G.difficulty==='easy'?(visible.find(other=>{const owner=easyAttackOwner(other);return !owner||owner===actor;})||visible[0]):visible[0];
  if(next?.id!==actor.target){
    actor.react=tuning.reaction+Math.random()*tuning.jitter;
    actor.botAimTime=0;actor.botStillAim=0;actor.botScoped=false;actor.botBurstShots=0;actor.botBurstPause=0;
    actor.botHeadIntent=Math.random()<tuning.headChance;
    actor.botTrackedAim=null;actor.botTriggerWait=0;
    chooseBotAimError(actor);
  }
  actor.target=next?.id??null;
}
function updateBot(actor,dt) {
  const tuning=BOT_TUNING[G.difficulty];
  actor.think-=dt;actor.react=Math.max(0,actor.react-dt);
  actor.botRecoil=Math.max(0,(actor.botRecoil||0)-dt*.055);
  actor.botBurstPause=Math.max(0,(actor.botBurstPause||0)-dt);
  actor.botTriggerWait=Math.max(0,(actor.botTriggerWait||0)-dt);
  if(actor.think<=0){thinkBot(actor);actor.think=.16+Math.random()*.09;}
  const enemy=G.actors.find(a=>a.id===actor.target&&a.alive);
  if(updateBotBombTask(actor,enemy,dt)) {
    const held=actor.inventory[actor.slot];
    if(held&&held.ammo===0&&WEAPONS[held.id].clip&&actor.botAction!=='defusing')reload(actor);
    return;
  }
  const chest=enemy?.pos.clone().add(V(0,enemy.crouch?21:43,0));
  if(enemy&&(lineClear(eye(actor),chest)||lineClear(eye(actor),eye(enemy)))) {
    actor.botAction='combat';
    actor.botAimTime=(actor.botAimTime||0)+dt;
    const aimPoint=botAimPosition(actor,enemy,dt);
    const difference=aimPoint.sub(eye(actor));
    const bias=actor.botAimBias||[0,0];
    const settle=.3+.7*Math.exp(-actor.botAimTime*1.8);
    const angle=Math.atan2(-difference.x,-difference.z)+bias[0]*settle;
    const turn=Math.atan2(Math.sin(angle-actor.yaw),Math.cos(angle-actor.yaw));
    const pitchTarget=Math.atan2(difference.y,Math.hypot(difference.x,difference.z))+bias[1]*settle;
    const pitchTurn=pitchTarget-actor.pitch;
    actor.yaw+=clamp(turn,-dt*tuning.turn,dt*tuning.turn);
    actor.pitch+=clamp(pitchTurn,-dt*tuning.pitch,dt*tuning.pitch);
    const strafe=actor.id%2?1:-1;
    const direction=V(Math.cos(actor.yaw)*strafe,0,-Math.sin(actor.yaw)*strafe);
    moveActor(actor,difference.length()<180?direction:V(),dt,{crouch:difference.length()>800&&actor.id%3===0});
    const item=actor.inventory[actor.slot],weapon=WEAPONS[item?.id];
    const aiming=Math.abs(turn)<.055&&Math.abs(pitchTurn)<.045;
    actor.botStillAim=aiming&&actor.vel.length()<25?(actor.botStillAim||0)+dt:0;
    actor.botScoped=item?.id==='awp'&&actor.botStillAim>=tuning.scopeDelay;
    if(actor.react===0&&aiming&&actor.botBurstPause===0&&actor.botTriggerWait===0&&actor.cooldown===0&&(!item||item.id!=='awp'||actor.botScoped)&&botMayFireAt(actor,enemy)) {
      if(tuning.grenades&&actor.inventory[4]&&difference.length()>300&&difference.length()<850&&actor.cooldown===0)throwGrenade(actor);
      else if(item&&weapon&&(!weapon.clip||item.ammo>0)&&!actor.reload) {
        const before=item.ammo;shoot(actor);
        if(item.ammo<before) {
          actor.botBurstShots=(actor.botBurstShots||0)+1;
          actor.botTriggerWait=tuning.shotGap;
          const burstLength=weapon.auto?tuning.burst+(G.difficulty==='hard'?actor.id%2:0):1;
          if(actor.botBurstShots>=burstLength) {
            actor.botBurstShots=0;actor.botBurstPause=tuning.pause+Math.random()*.22;
            chooseBotAimError(actor);
          }
        }
      }
    }
  } else {
    actor.botAimTime=0;actor.botStillAim=0;actor.botScoped=false;
    const goal=botGoal(actor);
    actor.botAction='moving';
    if(actor.team==='T'&&G.bomb.carrier===actor.id&&siteAt(actor)){moveActor(actor,V(),dt);plant(actor,dt);}
    else {
      actor.taskProgress=0;followPath(actor,goal,dt);
      updateBotGuardLook(actor,dt);
      if(G.mapName==='cs_assault'&&actor.team==='CT'&&G.elapsed-actor.lastUse>2) {
        const nearby=G.hostages.some(h=>h.alive&&!h.rescued&&h.owner===null&&h.pos.distanceTo(actor.pos)<100);
        if(nearby){useHostage(actor);actor.lastUse=G.elapsed;}
      }
    }
  }
  const item=actor.inventory[actor.slot];
  if(item&&item.ammo===0&&WEAPONS[item.id].clip)reload(actor);
}
function updatePlayer(dt) {
  const actor=G.player;
  if(!actor.alive)return;
  const input=G.input;
  const wish=V();
  const ahead=forward(actor.yaw),right=V(Math.cos(actor.yaw),0,-Math.sin(actor.yaw));
  if(input.has('KeyW'))wish.add(ahead);if(input.has('KeyS'))wish.sub(ahead);
  if(input.has('KeyD'))wish.add(right);if(input.has('KeyA'))wish.sub(right);
  const crouch=input.has('ControlLeft')||input.has('ControlRight')||input.has('KeyC');
  const jump=input.has('Space')||G.jumpQueued;
  moveActor(actor,wish,dt,{crouch,walk:input.has('ShiftLeft')||input.has('ShiftRight'),jump});
  if(jump){input.delete('Space');G.jumpQueued=false;}
  const item=actor.inventory[actor.slot],weapon=WEAPONS[item.id];
  const planting=item.id==='c4'&&G.fireHeld;
  if(planting) {
    if(!plant(actor,dt))hint('C4 需要在 A / B 包点站定安放',.2);
  } else actor.taskProgress=0;
  if((G.fireHeld||G.fireEdge)&&!planting&&(weapon.auto||G.fireEdge))shoot(actor);
  if(G.altEdge) {
    if(item.id==='awp'){actor.scopeTimer=0;actor.resumeScope=0;G.scope=(G.scope+1)%3;sound('zoom');}
    else if(isMelee(item.id))shoot(actor,true);
    else if(item.id==='glock'&&actor.cooldown===0) {
      item.burst=!item.burst;actor.cooldown=.25;hint(item.burst?'Glock 三连发模式':'Glock 半自动模式',2);eventLog('glock_mode',{burst:item.burst});
    } else if(['m4a1','usp'].includes(item.id)&&actor.cooldown===0&&!actor.reload) {
      item.silenced=item.silenced===false;actor.cooldown=G.viewWeapon.setSilenced(item.silenced,true)||3;
      hint(item.silenced?'正在安装消音器':'正在卸下消音器',actor.cooldown);eventLog('silencer',{attached:item.silenced,weapon:item.id});
    }
  }
  if(G.useHeld)defuse(actor,dt);
  if(G.useEdge){useDoor(actor);useHostage(actor);}
  G.fireEdge=G.altEdge=G.useEdge=false;
}
function endRound(team,reason) {
  if(G.phase==='ended')return;
  cancelGrenadeAim();
  G.phase='ended';G.phaseTime=6;G.winner=team;G.score[team]++;
  const match=G.score[team]>=16;
  announce((team==='CT'?'反恐精英胜利':'恐怖分子胜利')+'\n'+reason+(match?'\n比赛结束':''),6);
  sound(team==='CT'?'ctwin':'terwin');
  for(const actor of G.actors)actor.money=Math.min(16000,actor.money+(actor.team===team?3250:1400));
  eventLog('round_end',{winner:team,reason,score:{...G.score}});
}
function checkRound() {
  if(G.phase!=='live')return;
  const ct=G.actors.some(a=>a.team==='CT'&&a.alive),t=G.actors.some(a=>a.team==='T'&&a.alive);
  if(!ct){endRound('T','反恐精英已被消灭');return;}
  if(!t&&!G.bomb.planted){endRound('CT','恐怖分子已被消灭');return;}
  if(G.time<=0&&!G.bomb.planted)endRound(G.mapName==='de_dust2'?'CT':'T','回合时间已到');
}
function simulate(dt) {
  if(G.state!=='playing')return;
  G.elapsed+=dt;G.task=null;
  G.kick=Math.max(0,G.kick-dt*.15);G.recoil=Math.max(0,G.recoil-dt*.08);G.damage=Math.max(0,G.damage-dt);G.flash=Math.max(0,G.flash-dt*2);
  if(G.phase==='freeze') {
    G.phaseTime-=dt;
    if(G.phaseTime<=0){G.phase='live';sound('go');eventLog('round_live');}
  } else if(G.phase==='ended') {
    G.phaseTime-=dt;
    if(G.phaseTime<=0){if(G.score.CT>=16||G.score.T>=16){pauseGame();return;}spawnRound();}
  } else {
    G.time-=dt;G.buyTime=Math.max(0,G.buyTime-dt);
    updatePlayer(dt);
    for(const actor of G.actors)if(actor.alive&&!actor.human)updateBot(actor,dt);
    updateGrenades(dt);updateObjectives(dt);updateDoors(dt);checkRound();
  }
  for(const actor of G.actors) {
    updateWeapon(actor,dt);
    actor.mesh.position.copy(actor.pos);actor.mesh.rotation.y=actor.yaw+Math.PI/2;
    actor.mesh.update(dt,{moving:actor.vel.length()>10,crouch:actor.crouch,fire:actor.shotFlash>0,reloading:actor.reload>0,dead:!actor.alive,weaponId:actor.inventory[actor.slot]?.id,finish:actor.inventory[actor.slot]?.finish});
  }
  updateBlasts(dt);
  for(let i=G.effects.length-1;i>=0;i--){
    const effect=G.effects[i];effect.time-=dt;
    if(effect.time<=0){removeImpact(effect);G.effects.splice(i,1);}
    else if(effect.fade)effect.mesh.material.opacity=.67*effect.time/effect.fade;
  }
  G.feed=G.feed.filter(item=>item.time>G.elapsed);
}

function clearSpectatorView() {
  if (G.spectatorWeapon) {
    viewScene.remove(G.spectatorWeapon);
    G.spectatorWeapon.dispose();
  }
  G.spectatorWeapon = null;
  G.spectatorWeaponKey = null;
  G.spectatorCamera = null;
  G.spectatorTarget = null;
  G.activeViewWeapon = null;
}

function viewedActor() {
  if (G.player?.alive) return G.player;
  const selected = G.actors.find(actor => actor.id === G.spectatorTarget);
  if (selected?.alive && selected.team === G.team) return selected;
  const next = G.actors.find(actor => actor.alive && actor.team === G.team);
  if (next) {
    G.spectatorTarget = next.id;
    return next;
  }
  return selected || G.player;
}

function cycleSpectator(direction = 1) {
  const candidates = G.actors.filter(actor => actor.alive && actor.team === G.team);
  if (!candidates.length) return;
  const current = viewedActor();
  const index = candidates.findIndex(actor => actor.id === current?.id);
  const nextIndex = (index + direction + candidates.length) % candidates.length;
  G.spectatorTarget = candidates[nextIndex].id;
}

function viewedScope(actor) {
  if (actor === G.player) return G.scope;
  return actor?.alive && actor.inventory[actor.slot]?.id === 'awp' && actor.botScoped ? 1 : 0;
}

function updateSpectatorWeapon(actor, dt, scope) {
  const item = actor.inventory[actor.slot];
  const key = actor.alive && item ? actor.id + ':' + item.id + ':' + item.silenced + ':' + (item.finish||'default') : null;
  if (key !== G.spectatorWeaponKey) {
    if (G.spectatorWeapon) {
      viewScene.remove(G.spectatorWeapon);
      G.spectatorWeapon.dispose();
    }
    G.spectatorWeapon = key ? G.models.createViewWeapon(item.id,item.finish) : null;
    G.spectatorWeaponKey = key;
    if (G.spectatorWeapon) {
      viewScene.add(G.spectatorWeapon);
      G.spectatorWeapon.setSilenced?.(item.silenced !== false, false);
      G.spectatorWeapon.play('idle');
      G.spectatorWeapon.userData.wasFiring = false;
      G.spectatorWeapon.userData.wasReloading = false;
    }
  }
  const weapon = G.spectatorWeapon;
  if (!weapon) return null;
  const firing = actor.shotFlash > 0;
  const reloading = actor.reload > 0;
  if (firing && !weapon.userData.wasFiring) weapon.play('fire');
  if (reloading && !weapon.userData.wasReloading) weapon.play('reload');
  weapon.userData.wasFiring = firing;
  weapon.userData.wasReloading = reloading;
  weapon.visible = actor.alive && scope === 0;
  weapon.update(dt, {move: Math.hypot(actor.vel.x, actor.vel.z) / 250});
  return weapon;
}

function updateCamera(dt) {
  if (G.state === 'menu' || G.state === 'loading') {
    if (G.menuCamera) {
      camera.position.copy(G.menuCamera);
      camera.rotation.set(G.menuPitch, G.menuYaw, 0, 'YXZ');
    }
    return;
  }
  const actor = viewedActor();
  if (!actor) return;
  const scope = viewedScope(actor);
  camera.position.copy(renderEye(actor));
  if (actor === G.player && actor.alive) {
    camera.rotation.set(actor.pitch + G.recoil + G.kick, actor.yaw, 0, 'YXZ');
    G.activeViewWeapon = G.viewWeapon;
    if (G.spectatorWeapon) G.spectatorWeapon.visible = false;
  } else {
    const targetPitch = actor.pitch + (actor.botRecoil || 0);
    if (!G.spectatorCamera || G.spectatorCamera.actorId !== actor.id) {
      G.spectatorCamera = {actorId: actor.id, yaw: actor.yaw, pitch: targetPitch};
    }
    const observer = G.spectatorCamera;
    const yawError = Math.atan2(Math.sin(actor.yaw - observer.yaw), Math.cos(actor.yaw - observer.yaw));
    const blend = 1 - Math.exp(-dt * 13);
    observer.yaw += yawError * blend;
    observer.pitch += (targetPitch - observer.pitch) * blend;
    camera.rotation.set(observer.pitch, observer.yaw, 0, 'YXZ');
    G.activeViewWeapon = updateSpectatorWeapon(actor, G.state === 'playing' ? dt : 0, scope);
  }
  camera.fov = scope === 1 ? 30.54 : scope === 2 ? 7.51 : 73.74;
  camera.updateProjectionMatrix();
  for (const other of G.actors) other.mesh.visible = other !== actor;
  if(throwHand){
    throwHand.remaining-=dt;
    if(throwHand.remaining<=0)cancelGrenadeAim();
    else{throwHand.model.update(dt);G.activeViewWeapon=throwHand.model;}
  }
  if (G.viewWeapon) {
    G.viewWeapon.visible = !throwHand && actor === G.player && actor.alive && scope === 0;
    if (G.viewWeapon.visible) {
      G.viewWeapon.update(G.state === 'playing' ? dt : 0, {audible:true,priming:grenadePressedAt!==null,move: Math.hypot(actor.vel.x, actor.vel.z) / 250});
    }
  }
  if (muzzleFlash) {
    const item = actor.inventory[actor.slot];
    const unsilenced = item?.silenced === false;
    const flashes = ['ak47', 'awp', 'deagle', 'glock'].includes(item?.id) || unsilenced && ['m4a1', 'usp'].includes(item?.id);
    muzzleFlash.visible = actor.alive && scope === 0 && actor.shotFlash > 0 && flashes;
    muzzleFlash.material.rotation = Math.random() * Math.PI;
  }
}

function drawRadar() {
  const canvas=$('radar'),context=canvas.getContext('2d'),actor=viewedActor();if(!actor)return;
  context.clearRect(0,0,200,200);context.save();
  context.beginPath();context.arc(100,100,98,0,Math.PI*2);context.clip();
  context.fillStyle='#142121';context.fillRect(0,0,200,200);
  const print=floorPrint(G.mapName);
  context.save();context.translate(100,100);context.rotate(actor.yaw);context.globalAlpha=.83;
  context.drawImage(print.canvas,(print.left-actor.pos.x)/12,(print.top-actor.pos.z)/12,print.canvas.width/(12*print.scale),print.canvas.height/(12*print.scale));
  context.restore();context.strokeStyle='#adcbba50';context.lineWidth=1;
  context.beginPath();context.arc(100,100,50,0,Math.PI*2);context.stroke();

  context.beginPath();context.moveTo(0,100);context.lineTo(200,100);context.moveTo(100,0);context.lineTo(100,200);context.stroke();
  const plot=(position,color,size=4)=>{
    const dx=(position.x-actor.pos.x)/12,dz=(position.z-actor.pos.z)/12;
    const right=dx*Math.cos(actor.yaw)-dz*Math.sin(actor.yaw);
    const ahead=-dx*Math.sin(actor.yaw)-dz*Math.cos(actor.yaw);
    context.fillStyle=color;context.fillRect(clamp(100+right,4,194)-size/2,clamp(100-ahead,4,194)-size/2,size,size);
  };
  for(const mate of G.actors)if(mate.alive&&mate.team===actor.team)plot(mate.pos,mate===actor?'#fff7b0':'#b8ffe6',mate===actor?6:4);
  if(G.mapName==='de_dust2'&&actor.team==='T'&&(G.bomb.planted||G.bomb.carrier===null))plot(G.bomb.pos,'#ef4534',6);
  for(const hostage of G.hostages)if(!hostage.rescued&&hostage.alive&&actor.team==='CT')plot(hostage.pos,'#c99936',4);
  context.fillStyle='#ffdf6e';context.beginPath();context.moveTo(100,89);context.lineTo(95,103);context.lineTo(105,103);context.fill();context.restore();
}
function locationName() {
  const actor=viewedActor();if(!actor)return G.mapName;
  if(G.mapName==='de_dust2') {
    const site=siteAt(actor);if(site)return site.name+' 区爆破点';
    const p=actor.pos;
    if(p.z>-800)return 'T 出生区';if(p.x>700)return p.z<-1800?'A 大道 / A 区':'A 大道';
    if(p.x<-700)return p.z<-1900?'B 区 / B 门':'B 通道';
    if(p.y>0&&p.z<-1500)return 'A 小道';if(p.z<-2200)return 'CT 出生区';return '中路';
  }
  if(G.hostages.some(h=>h.pos.distanceTo(actor.pos)<230))return '仓库 · 人质区域';
  if(actor.pos.y>310)return '仓库屋顶 / 二层走道';
  if(actor.pos.z<-1200)return '仓库';return 'CT 出生区 / 街道';
}
function updateHUD() {
  if(!G.player)return;
  if(!$('buy').classList.contains('hidden')&&$('buyStatus').dataset.clock==='live')updateBuyClock();
  const actor=viewedActor(),item=actor.inventory[actor.slot],weapon=WEAPONS[item?.id||'knife'];
  const scope=viewedScope(actor);
  $('health').textContent=actor.hp;$('health').parentElement.classList.toggle('lowhealth',actor.hp<25);
  $('armor').textContent=Math.round(actor.armor);$('money').textContent='$ '+actor.money;
  $('weaponName').textContent=weapon.name+(actor.reload?' · 装填中':'');
  $('ammo').innerHTML=weapon.clip?item.ammo+' <em>|</em> '+item.reserve:'—';
  const seconds=Math.max(0,Math.ceil(G.bomb.planted?G.bomb.timer:G.phase==='freeze'?G.phaseTime:G.time));
  $('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  $('timer').classList.toggle('lowhealth',seconds<20&&G.phase==='live');
  drawGoldHud($('classicHud'),{health:actor.hp,armor:actor.armor,helmet:actor.helmet,time:seconds,money:actor.money,
    ammo:weapon.clip?item.ammo:null,reserve:item?.reserve||0,weapon:item?.id,kit:actor.kit,c4:G.bomb.carrier===actor.id,buyzone:G.player.alive&&buyAllowed(),planted:G.bomb.planted});
  $('ctScore').textContent=G.score.CT;$('tScore').textContent=G.score.T;
  $('phaseName').textContent=G.phase==='freeze'?'准备 '+Math.ceil(G.phaseTime):G.phase==='ended'?'回合结束':'第 '+G.round+' 回合';
  $('location').textContent=locationName();
  $('objective').textContent=G.bomb.planted?'C4 已安放':G.mapName==='de_dust2'?(G.bomb.carrier===G.player.id?'你携带了 C4':G.team==='CT'?'保卫 A / B 包点':'将 C4 安放到包点'):'人质获救 '+G.hostages.filter(h=>h.rescued).length+' / '+G.hostages.length;
  $('roundMessage').textContent=G.elapsed<G.messageUntil?G.message:'';
  let contextual='';
  if(G.phase==='live'&&G.player.alive) {
    if(G.team==='CT'&&G.bomb.planted&&G.player.pos.distanceTo(G.bomb.pos)<100)contextual='按住 E 拆除 C4';
    else if(G.team==='CT'&&G.hostages.some(h=>h.alive&&!h.rescued&&h.pos.distanceTo(G.player.pos)<100))contextual='E 让人质跟随 / 等待';
    else if(G.bomb.carrier===G.player.id&&siteAt(G.player))contextual='5 切到 C4 · 按住左键安放';
    else if(G.doors?.some(d=>G.player.pos.clone().add(V(0,36,0)).distanceTo(entityPosition(d.entity))<125))contextual='E 开门';
  }
  const hintText=G.elapsed<G.hintUntil?G.hintText:contextual;
  $('hint').textContent=grenadePressedAt===null?hintText:'';
  $('crosshair').classList.toggle('hidden',scope>0||!actor.alive||weapon.slot>=4||item?.id==='awp');
  $('crosshair').style.setProperty('--gap',(5+actor.accuracy*2+Math.hypot(actor.vel.x,actor.vel.z)*.035)+'px');
  $('scope').classList.toggle('hidden',scope===0||!actor.alive);
  $('damage').style.opacity=G.damage;$('flash').style.opacity=G.flash;
  const task=G.task;
  $('taskProgress').classList.toggle('hidden',!task);
  if(task){$('taskProgress').querySelector('span').textContent=task.text;$('taskProgress').querySelector('progress').value=task.value;}
  $('killfeed').innerHTML=G.feed.map(f=>'<div><span class="'+(f.team==='CT'?'ct':'terror')+'">'+f.killer+'</span> &nbsp; '+(WEAPONS[f.weapon]?.name||f.weapon)+(f.head?' ◉':'')+' &nbsp; <span class="'+(f.victimTeam==='CT'?'ct':'terror')+'">'+f.dead+'</span></div>').join('');
  $('inventory').innerHTML=Object.entries(actor.inventory).map(([slot,item])=>'<div class="'+(actor.slot===+slot?'equipped':'')+'"><kbd>'+slot+'</kbd>'+WEAPONS[item.id].name+'</div>').join('');
  $('spectator').classList.toggle('hidden',G.player.alive);
  $('spectator').textContent=actor.alive?'第一人称观战 '+actor.name+'\n左键 / Space 下一位 · 右键 上一位':'队友已全部阵亡\n等待下一回合';
  if(!$('scoreboard').classList.contains('hidden'))updateScoreboard();
  if(G.graph){const stats=collectStats();$('netgraph').textContent=stats.fps+' FPS · p50 '+stats.frameP50+' ms · p95 '+stats.frameP95+' ms\n'+stats.drawCalls+' calls · '+stats.triangles+' triangles · '+stats.geometries+' geometries\n'+G.nav.nodes.length+' nav nodes';}
  drawRadar();
}
function updateScoreboard() {
  $('scoreMap').textContent=G.mapName+' · 第 '+G.round+' 回合';
  let html='<table><tr><th>玩家</th><th>状态</th><th>击杀</th><th>死亡</th><th>类型</th></tr>';
  for(const team of ['CT','T']) {
    html+='<tr class="teamrow '+(team==='CT'?'ct':'terror')+'"><td colspan="5">'+(team==='CT'?'反恐精英':'恐怖分子')+' &nbsp; '+G.score[team]+'</td></tr>';
    for(const actor of G.actors.filter(a=>a.team===team))html+='<tr class="'+(actor.human?'me':'')+'"><td>'+actor.name+'</td><td>'+(actor.alive?'存活':'阵亡')+'</td><td>'+actor.kills+'</td><td>'+actor.deaths+'</td><td>'+ (actor.human?'本机':'BOT')+'</td></tr>';
  }
  $('scoreRows').innerHTML=html+'</table>';
}
const BUY_INFO = {
  ak47: {label:'CV-47 / AK-47',country:'俄罗斯',caliber:'7.62 mm',weight:'4.79 kg'},
  m4a1: {label:'MAVERICK M4A1 CARBINE',country:'美国',caliber:'5.56 mm',weight:'3.22 kg'},
  awp: {label:'MAGNUM SNIPER RIFLE',country:'英国',caliber:'.338 Magnum',weight:'6 kg'},
  glock: {label:'9X19MM SIDEARM / GLOCK',country:'奥地利',caliber:'9 mm',weight:'.9 kg'},
  usp: {label:'K&M .45 TACTICAL / USP',country:'德国',caliber:'.45 ACP',weight:'1 kg'},
  deagle: {label:'NIGHT HAWK .50C / DESERT EAGLE',country:'以色列',caliber:'.50 AE',weight:'1.8 kg'},
  vest: {label:'防弹衣',description:'提供 100 点护甲。'},
  armor: {label:'防弹衣和头盔',description:'提供 100 点护甲和头盔。'},
  he: {label:'高爆手雷',description:'按住左键瞄准、蓄力，松手投出。短按近投，蓄满远投。'},
  kit: {label:'拆弹器',description:'拆除 C4 所需时间缩短至 5 秒。'}
};

// Frame visible weapon vertices in their actual idle pose. The view mesh retains
// its original bind positions, so preview and first-person paint coordinates agree.
function frameWeaponPreview(model,stage,camera,id){
  model.play('idle');model.update(.05);model.updateMatrixWorld(true);
  const studio=model.userData.studio,mesh=studio.native.children.find(o=>o.isSkinnedMesh);
  const source=studio.asset.source;
  mesh.material=mesh.material.map((m,i)=>/^view_/i.test(source.textures[i].name)?stage.hiddenHands:m);
  const verts=[],seen=new Set(),geo=mesh.geometry;
  for(const group of geo.groups){
    if(!mesh.material[group.materialIndex].visible)continue;
    for(let i=group.start;i<group.start+group.count;i++){
      const index=geo.index.getX(i);
      if(seen.has(index))continue;
      seen.add(index);
      verts.push(mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
    }
  }
  model.userData.blade?.rig.traverse(part=>{
    if(!part.isMesh)return;
    const positions=part.geometry.attributes.position;
    for(let i=0;i<positions.count;i++)verts.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld));
  });
  const mean=new THREE.Vector3();for(const p of verts)mean.add(p);mean.divideScalar(verts.length);
  const covariance=new THREE.Matrix3().set(0,0,0,0,0,0,0,0,0),a=covariance.elements;
  for(const p of verts){
    p.sub(mean);a[0]+=p.x*p.x;a[1]+=p.x*p.y;a[2]+=p.x*p.z;
    a[4]+=p.y*p.y;a[5]+=p.y*p.z;a[8]+=p.z*p.z;
  }
  a[3]=a[1];a[6]=a[2];a[7]=a[5];
  function axis(seed,exclude){
    const v=seed.clone();
    for(let i=0;i<15;i++){v.applyMatrix3(covariance);if(exclude)v.addScaledVector(exclude,-v.dot(exclude));v.normalize();}
    return v;
  }
  const long=axis(new THREE.Vector3(.17,.26,-1));
  if(isMelee(id)?long.y<0:long.z>0)long.negate();
  const upright=axis(new THREE.Vector3(.19,1,.21),long);
  if(id==='he'){const vertical=long.clone();long.copy(upright);upright.copy(vertical);}
  if(upright.y<0)upright.negate();
  const normal=long.clone().cross(upright).normalize().addScaledVector(upright,.12).addScaledVector(long,.07).normalize();
  camera.up.copy(upright);camera.position.copy(mean).addScaledVector(normal,110);camera.lookAt(mean);camera.updateMatrixWorld(true);
  const bounds=new THREE.Box3();
  for(const p of verts)bounds.expandByPoint(p.add(mean).applyMatrix4(camera.matrixWorldInverse));
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const half=Math.max(size.y*.5,size.x/5.6)*1.13;
  camera.top=center.y+half;camera.bottom=center.y-half;camera.left=center.x-half*2.8;camera.right=center.x+half*2.8;camera.updateProjectionMatrix();
}


let previewStage;
const weaponPreviews=new Map();
function weaponPreview(id,finish){
  const key=id+'/'+finish;
  if(weaponPreviews.has(key))return weaponPreviews.get(key);
  if(!previewStage){
    const render=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    render.setSize(840,300,false);render.setClearColor(0,0);render.outputColorSpace=THREE.SRGBColorSpace;
    const stage=new THREE.Scene();
    stage.add(new THREE.HemisphereLight(0xf4f8ff,0xabc4d4,2.0));
    const keyLight=new THREE.DirectionalLight(0xfff0de,1.7);
    keyLight.position.set(-2,5,-2);stage.add(keyLight);
    const hiddenHands=new THREE.MeshBasicMaterial({visible:false});previewStage={render,stage,hiddenHands};
  }
  const {render,stage}=previewStage;
  const model=G.models.createViewWeapon(id,finish);stage.add(model);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,400);
  frameWeaponPreview(model,previewStage,camera,id);
  render.render(stage,camera);
  const image=render.domElement.toDataURL('image/png');
  stage.remove(model);model.dispose();weaponPreviews.set(key,image);
  return image;
}
function openFinishPurchase(id,pinned=true){
  if(!paintWeapons.has(id))return;
  G.buySelection=id;G.buyPinned=pinned;
  G.draftFinish=ownedOrPreferredFinish(id);
  drawFinishPurchase();
}
function drawFinishPurchase(){
  const id=G.buySelection,finish=G.draftFinish,weapon=WEAPONS[id],same=G.player.inventory[weapon.slot]?.id===id;
  const holder=$('buyDetails');
  const finishes=(id==='he'||isMelee(id))?gearPaintOrder:paintOrder;
  const chips=finishes.map(key=>'<button type="button" data-paint="'+key+'" aria-pressed="'+(key===finish)+'"><i class="paintChip chip-'+key+'"></i>'+paintCatalog[key].name+'</button>').join('');
  const allowed=buyAllowed(),cost=purchaseCost(id);
  const apply=same||isMelee(id)?'<button data-coat="'+id+'" '+(!allowed?'disabled':'')+'>'+(same?'免费换装':'免费装备')+'</button>':'';
  const purchase=isMelee(id)||(id==='he'&&same)?'':'<button data-checkout="'+id+'" '+(!allowed||G.player.money<cost?'disabled':'')+'>购买并装备　$'+cost+'</button>';
  const info = BUY_INFO[id];
  const facts=info?.caliber&&weapon.clip?'<details class="armoryFacts"><summary>装备资料</summary><dl><dt>弹匣容量</dt><dd>'+weapon.clip+' 发</dd><dt>口径</dt><dd>'+info.caliber+'</dd><dt>原产国</dt><dd>'+info.country+'</dd><dt>重量</dt><dd>'+info.weight+'</dd></dl></details>':info?.description?'<p class="armoryFacts">'+info.description+'</p>':'';
  holder.innerHTML='<div class="armory"><header><h2>'+weapon.name+'</h2><span>'+paintCatalog[finish].name+'</span></header>'
    +'<div class="itemRender"><img src="'+weaponPreview(id,finish)+'" alt="'+weapon.name+' · '+paintCatalog[finish].name+'"></div>'
    +'<div class="armorySwatches" role="group" aria-label="武器涂装">'+chips+'</div><div class="armoryActions">'+purchase+apply+'</div>'+facts+'</div>';
  $('buyItems').querySelectorAll('[data-buy]').forEach(b=>b.classList.toggle('selected',b.dataset.buy===id));
}
function applyOwnedFinish(id,finish){
  if(!buyAllowed()){updateBuy('当前不在购买时间或购买区');return false;}
  const slot=WEAPONS[id]?.slot,item=G.player.inventory[slot];
  if(!knownFinish(finish))return false;
  if(isMelee(id)){
    preferredMelee=id;try{localStorage.setItem('future-era.melee',id);}catch{}
    if(item?.id!==id){
      G.player.inventory[slot]=freshWeapon(id,finish);rememberFinish(id,finish);
      setWeapon(slot);return true;
    }
  }
  if(!item||item.id!==id)return false;
  item.finish=finish;rememberFinish(id,finish);
  if(G.player.slot===slot)G.viewWeapon?.setFinish(finish);
  return true;
}
function closeMenuDialogs() {
  for (const id of ['newGame','optionsDialog','exitDialog']) $(id).classList.add('hidden');
}

// Seven custom stencil glyphs; rasterized once at high resolution for both title surfaces.
function mountWordmark(){
  const glyphs={
    C:[42,'M10 1H42L39 11H16L11 16V33L15 37H39L36 47H8L1 40V11Z'],
    S:[41,'M10 1H41L38 11H15L11 15V19H32L39 26V36L29 47H0L3 37H24L28 33V29H9L2 22V10Z'],
    ':':[10,'M1 13H9V21H1ZM1 30H9V38H1Z'],
    '2':[40,'M4 1H32L39 8V20L29 28H15L10 33V37H39L36 47H0V30L12 19H26L29 16V11H1Z'],
    '0':[43,'M12 1H34L41 8V36L30 47H7L0 40V13ZM17 11L11 17V34L14 37H25L30 32V14L27 11Z'],
    '7':[39,'M2 1H39V9L19 47H6L25 12H0Z']
  };
  const ctx=nightCanvas(286*4,49*4);
  ctx.scale(4,4);ctx.transform(1,0,-.14,1,7,0);
  let x=0;
  for(const ch of 'CS:2077'){
    const [width,outline]=glyphs[ch];
    ctx.save();ctx.translate(x,0);ctx.fillStyle=ch==='C'||ch==='S'?'#edeee0':'#ebd66b';
    ctx.fill(new Path2D(outline),'evenodd');ctx.restore();x+=width+4;
  }
  document.documentElement.style.setProperty('--wordmark','url("'+ctx.canvas.toDataURL()+'")');
  document.documentElement.classList.add('hasWordmark');
}
const floorPrints=new Map();
function floorPrint(name){
  if(floorPrints.has(name))return floorPrints.get(name);
  const data=ASSET_MAPS[name],areas=data.navAreas;
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const {bounds:b} of areas){
    left=Math.min(left,b[0]);right=Math.max(right,b[3]);top=Math.min(top,-b[4]);bottom=Math.max(bottom,-b[1]);
  }
  const scale=470/Math.max(right-left,bottom-top);
  left-=5/scale;top-=5/scale;
  const ctx=nightCanvas(Math.ceil((right-left)*scale)+5,Math.ceil((bottom-top)*scale)+5);
  for(const {bounds:b} of areas){
    const h=clamp(Math.round((b[2]+110)/75),0,8);
    ctx.fillStyle='rgb('+(65+h*4)+','+(88+h*4)+','+(81+h*4)+')';
    ctx.fillRect((b[0]-left)*scale,(-b[4]-top)*scale,(b[3]-b[0])*scale+.3,(b[4]-b[1])*scale+.3);
  }
  // Ink the outside edge of the walkable footprint. Adjacent nav cells share one outline.
  const image=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height),pixels=image.data;
  const width=ctx.canvas.width,height=ctx.canvas.height;
  for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){
    const i=(y*width+x)*4;
    if(pixels[i+3]<130)continue;
    if(pixels[i-8+3]<96||pixels[i+8+3]<96||pixels[i-width*8+3]<96||pixels[i+width*8+3]<96){
      pixels[i]=135;pixels[i+1]=172;pixels[i+2]=157;
    }
  }
  ctx.putImageData(image,0,0);
  const plan={canvas:ctx.canvas,left,top,scale};
  floorPrints.set(name,plan);return plan;
}
function showMapPlan(){
  const name=$('mapSelect').value,plan=floorPrint(name),canvas=$('mapPlan'),ctx=canvas.getContext('2d');
  const k=Math.min(372/plan.canvas.width,250/plan.canvas.height);
  const ox=(canvas.width-plan.canvas.width*k)/2,oy=(canvas.height-plan.canvas.height*k)/2;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(plan.canvas,ox,oy,plan.canvas.width*k,plan.canvas.height*k);
  const data=ASSET_MAPS[name];
  function label(pos,text,color){
    const x=ox+(pos.x-plan.left)*plan.scale*k,y=oy+(pos.z-plan.top)*plan.scale*k;
    ctx.font='bold 18px Consolas,monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    const w=ctx.measureText(text).width+8;ctx.fillStyle='#10191bf2';ctx.fillRect(x-w/2,y-11,w,22);
    ctx.fillStyle=color;ctx.fillText(text,x,y+1);
  }
  function cluster(classname,text,color){
    const rows=data.entities.filter(e=>e.classname===classname);if(!rows.length)return;
    const center=V();for(const row of rows)center.add(entityPosition(row));label(center.divideScalar(rows.length),text,color);
  }
  cluster('info_player_start','CT','#abe2d2');cluster('info_player_deathmatch','T','#f2d969');
  if(name==='de_dust2'){
    for(const e of data.entities.filter(e=>e.classname==='func_bomb_target'))label(entityPosition(e),e.target==='tgt_a'?'A':'B','#ffe69a');
  }else cluster('hostage_entity','人质','#e9cc88');
  $('planCode').textContent=name.toUpperCase();
}
const menuLaunchers={newGame:'newGameButton',optionsDialog:'optionsButton',exitDialog:'quitButton',help:'controlsButton'};
function dismissMenuDialog(id){
  $(id).classList.add('hidden');
  $(menuLaunchers[id])?.focus({preventScroll:true});
}
function setupClassicUI() {
  mountWordmark();
  setupFinishControl();
  $('newGameButton').onclick = () => {closeMenuDialogs();showMapPlan();$('newGame').classList.remove('hidden');$('mapSelect').focus();};
  $('optionsButton').onclick = () => {closeMenuDialogs();$('optionsDialog').classList.remove('hidden');$('quality').focus();};
  $('quitButton').onclick = () => {closeMenuDialogs();$('exitDialog').classList.remove('hidden');$('exitDialog').querySelector('button').focus();};
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.onclick = () => dismissMenuDialog(button.dataset.closeDialog);
  });
  document.querySelectorAll('[data-game-tab]').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('[data-game-tab]').forEach(tab => tab.classList.toggle('selected',tab===button));
      document.querySelectorAll('[data-game-page]').forEach(page => page.classList.toggle('hidden',page.dataset.gamePage!==button.dataset.gameTab));
    };
  });
  $('buy').addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if(button.dataset.category){G.buyPinned=false;G.buySelection=null;G.buyPage=button.dataset.category;updateBuy();return;}
    if(button.dataset.paint&&G.buySelection){
      G.buyPinned=true;G.draftFinish=button.dataset.paint;drawFinishPurchase();
      $('buyDetails').querySelector('[data-paint="'+G.draftFinish+'"]').focus({preventScroll:true});return;
    }
    if(button.dataset.coat){if(applyOwnedFinish(button.dataset.coat,G.draftFinish)){closeBuy();requestMouse();}return;}
    if(button.dataset.checkout){completeBuy(button.dataset.checkout,G.draftFinish);return;}
    if(button.dataset.buy){if(paintWeapons.has(button.dataset.buy))openFinishPurchase(button.dataset.buy);else completeBuy(button.dataset.buy);return;}
    if (button.dataset.quick==='auto') automaticBuy();
    if (button.dataset.quick==='rebuy') rebuyEquipment();
  });
  $('buyItems').addEventListener('mouseover',event => {
    const button=event.target.closest('[data-buy]');
    if(button&&G.buyPage!=='main'&&!G.buyPinned&&G.buySelection!==button.dataset.buy)showBuyDetails(button.dataset.buy);
  });
  $('buyItems').addEventListener('focusin',event => {
    const button=event.target.closest('[data-buy]');
    if(button&&G.buyPage!=='main'&&!G.buyPinned&&G.buySelection!==button.dataset.buy)showBuyDetails(button.dataset.buy);
  });
}

function buyAllowed() {
  const spawns=G.team==='CT'?G.spawnCT:G.spawnT;
  return G.player?.alive&&(G.phase==='freeze'||G.phase==='live'&&G.buyTime>0)&&spawns.some(e=>entityPosition(e).distanceTo(center(G.player))<420);
}

function openBuy() {
  if(G.state!=='playing'||!G.player?.alive)return;
  releaseGameKeys();
  resetInput();G.buyPinned=false;G.buySelection=null;G.buyPage='main';$('buy').classList.remove('hidden');closePointer();updateBuy();
}

function closeBuy() {G.buySelection=null;G.draftFinish=null;$('buy').classList.add('hidden');}

function buyEntries() {
  if(G.buyPage==='pistols')return [
    {key:1,id:'glock',label:'9X19MM SIDEARM'},
    {key:2,id:'usp',label:'K&M .45 TACTICAL'},
    {key:3,label:'228 COMPACT'},
    {key:4,id:'deagle',label:'NIGHT HAWK .50C'},
    {key:5,label:G.team==='CT'?'ES FIVE-SEVEN':'.40 DUAL ELITES'}
  ];
  if(G.buyPage==='rifles')return G.team==='CT'?[
    {key:1,label:'CLARION 5.56'},{key:2,label:'SCHMIDT SCOUT'},
    {key:3,id:'m4a1',label:'MAVERICK M4A1 CARBINE'},
    {key:4,label:'BULLPUP'},{key:5,label:'KRIEG 550 COMMANDO'},
    {key:6,id:'awp',label:'MAGNUM SNIPER RIFLE'}
  ]:[
    {key:1,label:'IDF DEFENDER'},{key:2,id:'ak47',label:'CV-47'},
    {key:3,label:'SCHMIDT SCOUT'},{key:4,label:'KRIEG 552'},
    {key:5,id:'awp',label:'MAGNUM SNIPER RIFLE'},{key:6,label:'D3/AU-1'}
  ];
  if(G.buyPage==='melee')return Object.entries(meleeNames).map(([id,label],i)=>({key:i+1,id,label}));
  if(G.buyPage==='equipment')return [
    {key:1,id:'vest',label:'防弹衣'}, {key:2,id:'armor',label:'防弹衣和头盔'},
    {key:3,label:'闪光弹'}, {key:4,id:'he',label:'高爆手雷'},
    {key:5,label:'烟雾弹'}, {key:6,label:'夜视仪'},
    {key:7,id:G.team==='CT'?'kit':null,label:'拆弹器'}, {key:8,label:'战术盾牌'}
  ];
  return [
    {key:1,category:'pistols',label:'手枪'}, {key:2,label:'霰弹枪'},
    {key:3,label:'冲锋枪'}, {key:4,category:'rifles',label:'步枪'},
    {key:5,label:'机枪'}, {key:6,id:'ammo1',label:'主武器弹药'},
    {key:7,id:'ammo2',label:'副武器弹药'}, {key:8,category:'equipment',label:'装备'}, {key:9,category:'melee',label:'近战武器'}
  ];
}

function ammunitionCost(id) {
  const slot=id==='ammo1'?1:2;
  const item=G.player.inventory[slot];
  return {ak47:80,m4a1:60,awp:125,deagle:40,usp:25,glock:20}[item?.id]||0;
}

function purchaseCost(id) {
  if(id==='ammo1'||id==='ammo2')return ammunitionCost(id);
  if(id==='armor'&&G.player.armor>=100)return G.player.helmet?0:350;
  if(id==='vest'&&G.player.armor>=100||id==='kit'&&G.player.kit||id==='he'&&G.player.inventory[4])return 0;
  return WEAPONS[id]?.cost??{vest:650,armor:1000,kit:200,ammo:300}[id];
}

function showBuyDetails(id) {
  if(paintWeapons.has(id)){openFinishPurchase(id,false);return;}
  G.buySelection=null;
  const info=BUY_INFO[id];
  if(!info)return;
  const weapon=WEAPONS[id];
  const image=ASSET_UI.weapons[id==='vest'?'armor':id];
  let html=(image?'<img src="'+image+'" alt="'+info.label+'">':'')+'<h2>'+info.label+'</h2>';
  html+='<dl><dt>价格</dt><dd>$'+purchaseCost(id)+'</dd>';
  if(weapon?.clip)html+='<dt>口径</dt><dd>'+info.caliber+'</dd><dt>弹匣容量</dt><dd>'+weapon.clip+' 发</dd><dt>原产国</dt><dd>'+info.country+'</dd><dt>重量</dt><dd>'+info.weight+'</dd>';
  if(info.description)html+='<dt>装备说明</dt><dd>'+info.description+'</dd>';
  $('buyDetails').innerHTML=html+'</dl>';
}

function updateBuyClock(){
  const status=$('buyStatus');
  const message=buyAllowed()?'购买时间 '+Math.ceil(G.buyTime)+' 秒':'仅在购买时间内的出生区可购买';
  if(status.textContent!==message)status.textContent=message;
}
function updateBuy(message='') {
  if(!G.player)return;
  $('buyMoney').textContent='$ '+G.player.money;
  $('buyRoot').classList.toggle('hidden',G.buyPage==='main');
  $('buyTitle').textContent={main:'装备采购',pistols:'手枪',rifles:'步枪',equipment:'装备',melee:'近战武器'}[G.buyPage]||'BUY MENU';
  $('buyStatus').dataset.clock=message?'message':'live';
  if(message)$('buyStatus').textContent=message;else updateBuyClock();
  const entries=buyEntries().filter(entry=>entry.id||entry.category);
  $('buyItems').innerHTML=entries.map(entry=>{
    let disabled=false;
    if(entry.id&&!paintWeapons.has(entry.id))disabled=!buyAllowed()||purchaseCost(entry.id)===0||G.player.money<purchaseCost(entry.id);
    if(entry.id?.startsWith('ammo')&&entry.id!=='ammo') {
      const item=G.player.inventory[entry.id==='ammo1'?1:2];
      disabled=disabled||!item||item.reserve>=WEAPONS[item.id].reserve;
    }
    const price=entry.id?purchaseCost(entry.id):undefined;
    const priceTag=price>0&&G.buyPage!=='main'?'<small class="itemPrice">$'+price+'</small>':'';
    return '<button '+(entry.id?'data-buy="'+entry.id+'" ':'')+(entry.category?'data-category="'+entry.category+'" ':'')+'data-key="'+entry.key+'"'+(disabled?' disabled':'')+'><kbd>'+entry.key+'</kbd>'+(paintWeapons.has(entry.id)?WEAPONS[entry.id].name:entry.label)+priceTag+'</button>';
  }).join('');
  if(G.buySelection){drawFinishPurchase();return;}
  if(G.buyPage==='main') {
    const slots={1:'主武器',2:'副武器',3:'近战',4:'投掷物',5:'任务装备'};
    const kit=Object.values(G.player.inventory).map(item=>{
      const w=WEAPONS[item.id],finish=item.finish||defaultFinish;
      const paint=paintWeapons.has(item.id)&&knownFinish(finish)?paintCatalog[finish].name:'';
      return '<li><small>'+slots[w.slot]+'</small><b>'+w.name+'</b><em>'+paint+'</em></li>';
    }).join('');
    const inventory=G.player.inventory;
    const current=paintWeapons.has(inventory[G.player.slot]?.id)?inventory[G.player.slot]:(inventory[1]||inventory[2]||inventory[3]);
    const preview=current?'<div class="itemRender kitRender"><img alt="'+WEAPONS[current.id].name+'" src="'+weaponPreview(current.id,current.finish||defaultFinish)+'"></div>':'';
    $('buyDetails').innerHTML='<h2>随身装备</h2>'+preview+'<ul class="kitList">'+kit+'</ul><div class="buyQuick"><button data-quick="auto"><kbd>A</kbd>自动购买</button><button data-quick="rebuy"><kbd>R</kbd>重新购买上次装备</button></div>';
  } else {
    const first=entries.find(entry=>entry.id);
    if(first)showBuyDetails(first.id);
  }
}

function buy(id,finish=finishPreferences[id]) {
  if(!buyAllowed()){updateBuy('当前无法购买');return false;}
  const actor=G.player,cost=purchaseCost(id);
  if(cost===0){updateBuy('已拥有该装备');return false;}
  if(cost===undefined||actor.money<cost){updateBuy('资金不足');return false;}
  if(id==='ak47'&&G.team==='CT'||id==='m4a1'&&G.team==='T'||id==='kit'&&G.team==='T')return false;
  if(id==='ammo1'||id==='ammo2') {
    const item=actor.inventory[id==='ammo1'?1:2];
    if(!item||item.reserve>=WEAPONS[item.id].reserve)return false;
    item.reserve=Math.min(WEAPONS[item.id].reserve,item.reserve+WEAPONS[item.id].clip);
  } else if(id==='armor'){actor.armor=100;actor.helmet=true;}
  else if(id==='vest')actor.armor=100;
  else if(id==='kit')actor.kit=true;
  else if(id==='ammo'){for(const item of Object.values(actor.inventory))item.reserve=WEAPONS[item.id].reserve;}
  else {const slot=WEAPONS[id].slot;actor.inventory[slot]=freshWeapon(id,finish);if(paintWeapons.has(id)&&knownFinish(finish))rememberFinish(id,finish);setWeapon(slot);}
  actor.money-=cost;
  if(!id.startsWith('ammo')) {
    G.rebuyEquipment=G.rebuyEquipment||{};
    G.rebuyEquipment[WEAPONS[id]?.slot||id]=id;
  }
  eventLog('purchase',{item:id,money:actor.money});updateBuy('已购买 '+(WEAPONS[id]?.name||BUY_INFO[id]?.label||'弹药'));
  return true;
}

function completeBuy(id,finish) {
  if(buy(id,finish)){closeBuy();requestMouse();}
}

function automaticBuy() {
  const actor=G.player;
  const primary=G.team==='CT'?'m4a1':'ak47';
  if(!actor.inventory[1]&&actor.money>=WEAPONS[primary].cost)buy(primary);
  if((actor.armor<100||!actor.helmet)&&actor.money>=purchaseCost('armor'))buy('armor');
  else if(actor.armor<100&&actor.money>=650)buy('vest');
  if(G.team==='CT'&&!actor.kit&&actor.money>=200)buy('kit');
  if(!actor.inventory[4]&&actor.money>=300)buy('he');
  closeBuy();requestMouse();
}

function rebuyEquipment() {
  for(const id of Object.values(G.rebuyEquipment||{})) {
    const slot=WEAPONS[id]?.slot;
    if(slot&&G.player.inventory[slot]?.id===id)continue;
    if(purchaseCost(id)===0)continue;
    if(purchaseCost(id)<=G.player.money)buy(id);
  }
  closeBuy();requestMouse();
}

function handleBuyKey(event) {
  if(event.repeat)return;
  if(event.code==='Digit0'){closeBuy();requestMouse();return;}
  if(event.code==='Backspace'){G.buyPinned=false;G.buySelection=null;G.buyPage='main';updateBuy();return;}
  if(event.code==='KeyA'){automaticBuy();return;}
  if(event.code==='KeyR'){rebuyEquipment();return;}
  if(event.code==='Enter'&&G.buySelection){const control=$('buyDetails').querySelector('[data-checkout]:enabled,[data-coat]:enabled');control?.click();return;}
  const digit=/^Digit([1-9])$/.exec(event.code)?.[1];
  if(digit)$('buyItems').querySelector('[data-key="'+digit+'"]')?.click();
}

function pauseGame() {
  if(G.state!=='playing')return;
  releaseGameKeys();
  clearHitMarker();clearCombatMedal();
  G.state='paused';resetInput();closeBuy();
  closeMenuDialogs();$('menu').classList.remove('hidden');$('menu').classList.add('in-game');$('pausePanel').classList.remove('hidden');$('pauseSummary').classList.remove('hidden');
  $('pauseSummary').textContent=G.mapName+' · 第 '+G.round+' 回合 · CT '+G.score.CT+' / T '+G.score.T;closePointer();
}
function resumeGame() {
  G.state='playing';$('menu').classList.add('hidden');resetInput();requestMouse();
}
async function startGame() {
  if(G.state==='loading')return;
  G.startTriggered=performance.now();
  G.state='loading';G.ready=false;$('loading').classList.remove('hidden');$('menu').classList.add('hidden');
  await initAudio();
  G.team=$('teamSelect').value;G.difficulty=$('difficulty').value;G.initialMoney=+$('moneySelect').value;G.aiSeed=Math.random();
  if(G.mapName!==$('mapSelect').value)await changeMap($('mapSelect').value);
  G.score={CT:0,T:0};G.round=0;G.elapsed=0;G.events=[];G.rebuyEquipment={};
  spawnRound(false);G.state='playing';G.awaitingReady='playing';
  $('loading').classList.add('hidden');$('hud').classList.remove('hidden');
  setQuality();requestMouse();
}
function backToMenu() {
  releaseGameKeys();
  G.state='menu';resetInput();closeBuy();closePointer();resetRoundObjects();
  leaveGameFullscreen();
  closeMenuDialogs();$('menu').classList.remove('hidden','in-game');$('pausePanel').classList.add('hidden');$('pauseSummary').classList.add('hidden');$('hud').classList.add('hidden');
}
function setupInput() {
  setupClassicUI();
  $('start').onclick=()=>playFullscreen(startGame);
  $('startWindow').onclick=async()=>{
    await leaveGameFullscreen();
    await startGame();
  };
  $('resume').onclick=resumeGame;$('resumeFullscreen').onclick=()=>playFullscreen(resumeGame);
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement&&!expectedFullscreenExit&&G.state==='playing')pauseGame();
    expectedFullscreenExit=false;
    $('resumeFullscreen').classList.toggle('hidden',!!document.fullscreenElement);
    syncGameKeys();
  });
  $('restart').onclick=()=>{G.score={CT:0,T:0};G.round=0;G.elapsed=0;G.aiSeed=Math.random();spawnRound(false);resumeGame();};
  $('backMenu').onclick=backToMenu;
  $('controlsButton').onclick=()=>{$('help').classList.remove('hidden');$('closeHelp').focus();};$('closeHelp').onclick=()=>dismissMenuDialog('help');
  $('mute').onchange=()=>{G.muted=!$('mute').checked;};
  $('quality').onchange=setQuality;
  $('mapSelect').onchange=()=>{showMapPlan();$('mapDescription').textContent=$('mapSelect').value==='de_dust2'?'爆破任务。进攻或守住 A、B 两个包点。':'营救任务。将仓库内的人质带回接应街区。';};
  $('closeBuy').onclick=()=>{closeBuy();requestMouse();};
  addEventListener('resize',setQuality);
  addEventListener('keydown',event=>{
    if(event.code==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&G.state!=='playing'){
      const dialog=document.querySelector('#help:not(.hidden) .panel,#menu:not(.hidden) .classicDialog:not(.hidden)');
      if(dialog){
        const focusable=[...dialog.querySelectorAll('button:enabled,select:enabled,input:enabled')].filter(el=>el.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){
          event.preventDefault();(event.shiftKey?last:first).focus();
        }
      }
    }
    const inShop=G.state==='playing'&&!$('buy').classList.contains('hidden');
    if(event.metaKey||event.altKey||(inShop&&event.ctrlKey))return;
    if(inShop&&event.code==='Tab')return;
    if(inShop&&['Enter','Space'].includes(event.code)&&event.target.closest('#buy button'))return;
    if(G.state==='playing'&&!inShop&&gameKeyCodes.has(event.code))event.preventDefault();
    if(event.code==='Escape') {
      const dialog=['newGame','optionsDialog','exitDialog'].find(id=>!$(id).classList.contains('hidden'));
      if(dialog&&!$('menu').classList.contains('hidden')){dismissMenuDialog(dialog);return;}
      if(!$('help').classList.contains('hidden')){dismissMenuDialog('help');return;}
      if(!$('buy').classList.contains('hidden')){closeBuy();requestMouse();return;}
      if(G.state==='playing')pauseGame();else if(G.state==='paused')resumeGame();return;
    }
    if(G.state!=='playing')return;
    if(event.code==='Tab'){$('scoreboard').classList.remove('hidden');updateScoreboard();return;}
    if(event.code==='F3'&&!event.repeat){G.graph=!G.graph;$('netgraph').classList.toggle('hidden',!G.graph);}
    if(event.code==='KeyB'&&!event.repeat){if($('buy').classList.contains('hidden'))openBuy();else{closeBuy();requestMouse();}return;}
    if(!$('buy').classList.contains('hidden')){event.preventDefault();handleBuyKey(event);return;}
    if(!G.player.alive&&event.code==='Space'&&!event.repeat){cycleSpectator();return;}
    if(event.code==='Space'&&G.phase==='live')G.jumpQueued=true;
    G.input.add(event.code);
    if(event.repeat)return;
    if(event.code==='KeyR'&&G.player.alive)reload(G.player);
    if(/^Digit[1-5]$/.test(event.code)&&G.player.alive)setWeapon(+event.code.slice(-1));
    if(event.code==='KeyE'){G.useHeld=G.useEdge=true;}
    if(event.code==='KeyG')dropItem();
  });
  addEventListener('keyup',event=>{G.input.delete(event.code);if(event.code==='KeyE')G.useHeld=false;if(event.code==='Tab')$('scoreboard').classList.add('hidden');});
  $('game').addEventListener('mousedown',event=>{
    if(G.state!=='playing')return;
    if(!G.player.alive){cycleSpectator(event.button===2?-1:1);return;}
    if(!document.pointerLockElement){requestMouse();drag=true;mouseLast=[event.clientX,event.clientY];}
    if(event.button===0){
      if(G.player.inventory[G.player.slot]?.id==='he')beginGrenadeAim();
      else G.fireHeld=G.fireEdge=true;
    }
    if(event.button===2)G.altEdge=true;
  });
  addEventListener('mouseup',event=>{
    if(event.button!==0)return;
    G.fireHeld=false;drag=false;
    releaseGrenadeAim();
  });
  addEventListener('mousemove',event=>{
    if(G.state!=='playing'||!G.player?.alive)return;
    if(grenadePressedAt!==null&&!(event.buttons&1))cancelGrenadeAim();
    const locked=document.pointerLockElement===$('game');if(!locked&&!drag)return;
    const x=locked?event.movementX:event.clientX-mouseLast[0],y=locked?event.movementY:event.clientY-mouseLast[1];
    mouseLast=[event.clientX,event.clientY];
    const zoomSensitivity=G.scope===1?.44:G.scope===2?.11:1;
    const sensitivity=+$('sensitivity').value*.0015*zoomSensitivity;
    G.player.yaw-=x*sensitivity;G.player.pitch=clamp(G.player.pitch-y*sensitivity,-1.53,1.53);
  });
  $('game').addEventListener('wheel',event=>{event.preventDefault();if(G.state==='playing')cycleWeapon(event.deltaY>0?1:-1);},{passive:false});
  addEventListener('contextmenu',event=>event.preventDefault());
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement){G.pointerUnlockExpected=false;return;}
    if(G.pointerUnlockExpected){G.pointerUnlockExpected=false;return;}
    if(!document.pointerLockElement&&G.state==='playing'&&$('buy').classList.contains('hidden')&&$('help').classList.contains('hidden'))pauseGame();
  });
  addEventListener('focus',syncGameKeys);
  addEventListener('blur',()=>{if(G.state==='playing')pauseGame();resetInput();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='playing')pauseGame();});
}

function percentile(values,p) {if(!values.length)return 0;const sorted=values.slice().sort((a,b)=>a-b);return +sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))].toFixed(2);}
function collectStats() {
  const p50=percentile(G.frames,.5),size=renderer.getDrawingBufferSize(V());
  return {fps:p50?Math.round(1000/p50):0,frameP50:p50,frameP95:percentile(G.frames,.95),cpuP50:percentile(G.cpuFrames,.5),cpuP95:percentile(G.cpuFrames,.95),
    drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
    heapMB:performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(1):null,
    menuReadyMs:+G.loadTime.toFixed(1),playReadyDelayMs:G.firstPlayable&&G.startTriggered?+(G.firstPlayable-G.startTriggered).toFixed(1):0,mapLoadMs:+G.mapLoad.toFixed(1),quality:G.quality,resolution:[size.x,size.y],actors:G.actors.length,hostages:G.hostages.length,
    navNodes:G.nav?.nodes.length||0,navLadders:G.nav?.ladderLinks||0,mapTriangles:G.map?.triangles||0,programs:renderer.info.programs?.length||0};
}
function snapshot() {
  const actorData=a=>({id:a.id,name:a.name,team:a.team,alive:a.alive,pos:a.pos.toArray(),yaw:a.yaw,pitch:a.pitch,hp:a.hp,armor:a.armor,money:a.money,weapon:a.inventory?.[a.slot]?.id,
    ammo:a.inventory?.[a.slot]?.ammo,reserve:a.inventory?.[a.slot]?.reserve,grounded:a.grounded,crouch:a.crouch,inventory:a.inventory,pathLength:a.path.length});
  return {state:G.state,map:G.mapName,phase:G.phase,round:G.round,time:G.time,elapsed:G.elapsed,score:{...G.score},player:G.player?actorData(G.player):null,actors:G.actors.map(actorData),
    bomb:{carrier:G.bomb.carrier,planted:G.bomb.planted,pos:G.bomb.pos.toArray(),timer:G.bomb.timer,defuse:G.bomb.defuse},
    hostages:G.hostages.map(h=>({id:h.id,pos:h.pos.toArray(),owner:h.owner,rescued:h.rescued,alive:h.alive})),navNodes:G.nav?.nodes.length,
    sites:G.sites?.map(s=>({name:s.name,pos:s.pos.toArray(),bounds:s.entity.bounds})),rescues:G.rescues?.map(e=>({pos:entityPosition(e).toArray(),bounds:e.bounds})),events:G.events.slice()};
}
function rememberSimulationPositions() {
  for (const actor of G.actors.concat(G.hostages)) {
    if (!actor.previousPosition) actor.previousPosition = actor.pos.clone();
    actor.previousPosition.copy(actor.pos);
  }
}

function interpolateActorPositions(alpha) {
  for (const actor of G.actors.concat(G.hostages)) {
    if (!actor.previousPosition) actor.previousPosition = actor.pos.clone();
    if (!actor.renderPosition) actor.renderPosition = actor.pos.clone();
    if (actor.previousPosition.distanceToSquared(actor.pos) > 128 * 128) actor.previousPosition.copy(actor.pos);
    actor.renderPosition.copy(actor.previousPosition).lerp(actor.pos, alpha);
    actor.mesh.position.copy(actor.renderPosition);
  }
}

function renderEye(actor) {
  const position = actor.renderPosition;
  if (!position || position.distanceToSquared(actor.pos) > 128 * 128) return eye(actor);
  return position.clone().add(V(0, actor.crouch ? 28 : 64, 0));
}

function frame(now) {
  requestAnimationFrame(frame);
  const begin=performance.now(),rawFrame=now-rafPrevious,dt=Math.min(.05,rawFrame/1000);rafPrevious=now;
  if(G.state==='playing') {
    G.frames.push(rawFrame);if(G.frames.length>1800)G.frames.shift();
    G.accumulator=Math.min(.1,G.accumulator+dt);
    while(G.accumulator>=1/60){rememberSimulationPositions();simulate(1/60);G.accumulator-=1/60;}
  } else G.accumulator=0;
  interpolateActorPositions(G.state==='playing'?clamp(G.accumulator*60,0,1):1);
  updateCamera(dt);
  if(G.map)G.map.updateWeather(now*.001);
  renderer.info.reset();renderer.clear();renderer.render(scene,camera);
  if(G.state!=='menu'&&G.state!=='loading'&&G.activeViewWeapon?.visible){renderer.clearDepth();renderer.render(viewScene,viewCamera);}
  if(G.awaitingReady===G.state) {
    G.ready=true;G.awaitingReady=null;
    if(G.state==='menu'){G.loadTime=performance.now();performance.mark('menu-ready');}
    else{G.firstPlayable=performance.now();performance.mark('playable');}
  }
  if(now-hudPrevious>75){updateHUD();hudPrevious=now;}
  if(G.state==='playing'){G.cpuFrames.push(performance.now()-begin);if(G.cpuFrames.length>1800)G.cpuFrames.shift();}
}
async function boot() {
  try {
    renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
    renderer.autoClear=false;renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
    scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xd0e4fb,0x7b788b,1.85));
    const sun=new THREE.DirectionalLight(0xd1f2f4,1.05);sun.position.set(-500,2000,700);scene.add(sun);
    camera=new THREE.PerspectiveCamera(73.74,innerWidth/innerHeight,3,13000);camera.rotation.order='YXZ';
    viewScene=new THREE.Scene();viewCamera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,1000);
    const flashCanvas=document.createElement('canvas');flashCanvas.width=flashCanvas.height=64;
    const flashContext=flashCanvas.getContext('2d');
    const gradient=flashContext.createRadialGradient(32,32,2,32,32,30);
    gradient.addColorStop(0,'#ffffe9');gradient.addColorStop(.18,'#ffe9aa');gradient.addColorStop(.45,'#ffa133bb');gradient.addColorStop(1,'#ff730000');
    flashContext.fillStyle=gradient;flashContext.beginPath();
    for(let i=0;i<16;i++){const angle=i*Math.PI/8,radius=i%2?8:31;const x=32+Math.cos(angle)*radius,y=32+Math.sin(angle)*radius;if(i===0)flashContext.moveTo(x,y);else flashContext.lineTo(x,y);}
    flashContext.closePath();flashContext.fill();
    const flashTexture=new THREE.CanvasTexture(flashCanvas);
    muzzleFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:flashTexture,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));
    muzzleFlash.position.set(5,-3,-27);muzzleFlash.scale.set(7,7,1);muzzleFlash.visible=false;viewScene.add(muzzleFlash);
    setQuality();setupInput();
    showLoad('正在解压内嵌地图、模型和纹理…',1);
    const resources=await Promise.all([unpack(ASSET_MAPS_GZ),unpack(ASSET_MODELS_GZ),loadEditionTextures(),loadBlastTextures()]);
    window.ASSET_MAPS=resources[0];window.ASSET_MODELS=resources[1];
    showLoad('正在准备原版骨骼模型…',2);G.models=await loadModels(THREE,ASSET_MODELS);
    await loadGoldHud(ASSET_HUD);
    await changeMap('de_dust2');
    showLoad('正在预热场景…',5);await renderer.compileAsync(scene,camera);
    G.state='menu';G.awaitingReady='menu';
    $('loading').classList.add('hidden');$('menu').classList.remove('hidden');
    requestAnimationFrame(frame);
  } catch(error) {
    G.fatal=String(error.stack||error);$('fatal').textContent='启动失败。请使用支持 WebGL2 的新版 Chrome / Edge。\n'+error.message;console.error(error);
  }
}
window.__gameDebug={version:'1.0',get ready(){return G.ready;},get state(){return G.state;},get fatal(){return G.fatal;},stats:collectStats,snapshot,
  route(goal){return G.player?G.nav.path(G.player.pos,V(...goal)).map(node=>({pos:node.pos.toArray(),crouch:node.crouch,ladder:node.ladder})):[];},
  trace(a,b){return G.map.trace(V(...a),V(...b),0).fraction;},get renderer(){return renderer;}};
boot();

//# sourceURL=CS2077.js

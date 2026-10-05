// Small binary shape descriptors, not an image upload or a remote recognition service.
export function glyphDistance(a,b){if(!a||!b)return 1;let different=0,ink=0;for(let i=0;i<a[1].length;i++){const x=parseInt(a[1][i],16),y=parseInt(b[1][i],16);for(let bit=1;bit<16;bit<<=1){if((x|y)&bit)ink++;if((x^y)&bit)different++;}}return .8*different/Math.max(1,ink)+.2*Math.min(1,Math.abs(Math.log(Math.max(1,a[0])/Math.max(1,b[0]))));}
export function rankShapes(samples,characters,index,exclude=''){const positions=[...characters].map(c=>index.chars.indexOf(c));return Object.entries(index.fonts).filter(([name])=>name!==exclude).map(([family,font])=>({family,distance:samples.reduce((sum,s,i)=>sum+glyphDistance(s,font.glyphs[positions[i]]),0)/samples.length})).sort((a,b)=>a.distance-b.distance);}
export function describeGlyph(canvas){const c=canvas.getContext('2d',{willReadFrequently:true}),{width:w,height:h}=canvas,d=c.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}if(x1<x0)return null;const small=document.createElement('canvas');small.width=12;small.height=16;const t=small.getContext('2d');t.drawImage(canvas,x0,y0,x1-x0+1,y1-y0+1,0,0,12,16);const a=t.getImageData(0,0,12,16).data;let hex='';for(let i=0;i<192;i+=4){let n=0;for(let k=0;k<4;k++)n=n*2+(a[(i+k)*4+3]>110?1:0);hex+=n.toString(16);}return [Math.round((x1-x0+1)/(y1-y0+1)*100),hex];}
export function imageGlyphs(canvas,expected){
  const {width:w,height:h}=canvas,ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,w,h),gray=new Uint8Array(w*h),hist=new Uint32Array(256);
  for(let i=0;i<gray.length;i++){const alpha=data.data[i*4+3]/255;gray[i]=Math.round((.2126*data.data[i*4]+.7152*data.data[i*4+1]+.0722*data.data[i*4+2])*alpha+255*(1-alpha));hist[gray[i]]++;}
  let total=0;for(let i=0;i<256;i++)total+=i*hist[i];let n=0,sum=0,best=-1,threshold=127;for(let i=0;i<255;i++){n+=hist[i];sum+=i*hist[i];if(!n||n===gray.length)continue;const variance=n*(gray.length-n)*(sum/n-(total-sum)/(gray.length-n))**2;if(variance>best){best=variance;threshold=i;}}
  // Background comes from the crop perimeter; supports light or dark lettering.
  let edge=0,count=0;for(let x=0;x<w;x++){edge+=gray[x]+gray[(h-1)*w+x];count+=2;}for(let y=0;y<h;y++){edge+=gray[y*w]+gray[y*w+w-1];count+=2;}const darkInk=edge/count>threshold;
  const binary=document.createElement('canvas');binary.width=w;binary.height=h;const b=binary.getContext('2d'),pixels=b.createImageData(w,h),columns=new Uint32Array(w);let ink=0;
  for(let i=0;i<gray.length;i++)if(darkInk?gray[i]<=threshold:gray[i]>threshold){pixels.data[i*4+3]=255;columns[i%w]++;ink++;}b.putImageData(pixels,0,0);
  if(ink<12||ink>gray.length*.75)throw new Error('Use a clear crop of one line of text on a plain background.');
  // Connected components separate kerning overlaps that share an x column.
  const seen=new Uint8Array(w*h),parts=[];
  for(let seed=0;seed<seen.length;seed++){
    if(seen[seed]||!pixels.data[seed*4+3])continue;
    const queue=[seed],indices=[];seen[seed]=1;let x0=w,x1=0,y0=h,y1=0;
    for(let q=0;q<queue.length;q++){const i=queue[q],x=i%w,y=Math.floor(i/w);indices.push(i);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,j=ny*w+nx;if(nx<0||nx>=w||ny<0||ny>=h||seen[j]||!pixels.data[j*4+3])continue;seen[j]=1;queue.push(j);}
    }
    if(indices.length>=2)parts.push({x0,x1,y0,y1,indices});
  }
  // Join dot/accent components to their stems, but not adjacent full letters.
  const tallest=Math.max(...parts.map(p=>p.y1-p.y0+1));
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];if(p.y1-p.y0+1>tallest*.38)continue;const target=parts.find((t,j)=>j!==i&&t.y1-t.y0+1>tallest*.45&&Math.min(p.x1,t.x1)-Math.max(p.x0,t.x0)>=0&&Math.abs((p.x0+p.x1-t.x0-t.x1)/2)<Math.max(p.x1-p.x0,t.x1-t.x0)*.65);if(target){target.indices.push(...p.indices);target.x0=Math.min(target.x0,p.x0);target.x1=Math.max(target.x1,p.x1);target.y0=Math.min(target.y0,p.y0);target.y1=Math.max(target.y1,p.y1);parts.splice(i,1);}}
  parts.sort((a,b)=>a.x0-b.x0);
  if(parts.length!==expected)throw new Error(`Found ${parts.length} letter shapes for ${expected} characters. Crop one line tightly; avoid touching or connected letters.`);
  return parts.map(p=>{const g=document.createElement('canvas');g.width=p.x1-p.x0+1;g.height=p.y1-p.y0+1;const c=g.getContext('2d'),d=c.createImageData(g.width,g.height);for(const i of p.indices)d.data[((Math.floor(i/w)-p.y0)*g.width+i%w-p.x0)*4+3]=255;c.putImageData(d,0,0);return describeGlyph(g);});
}

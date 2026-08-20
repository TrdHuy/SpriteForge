import { SpriteSheet } from '../core/SpriteSheet';
import type { AnimationClipData, CollisionBox, CollisionKind, FrameRect, Vec2 } from '../core/types';

export interface DebugFlags { showGrid: boolean; showAnchor: boolean; showGround: boolean; showFrameBounds: boolean; showCollision: boolean; }
export interface PreviewLayout { anchorScreen: Vec2; zoom: number; frameWidth: number; frameHeight: number; scaleX: number; scaleY: number; flipX: boolean; flipY: boolean; anchor: Vec2; }

export function renderSheetView(canvas: HTMLCanvasElement, image: HTMLImageElement | null, spriteSheet: SpriteSheet | null, selectedRow: number, currentFrame: number, showGrid: boolean): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0,0,width,height); drawChecker(ctx,width,height,16);
  if (!image || !spriteSheet) { drawEmpty(ctx,width,height,'Load a sprite sheet to begin'); return; }
  const pad=18, scale=Math.min((width-pad*2)/image.width,(height-pad*2)/image.height), drawW=image.width*scale, drawH=image.height*scale, ox=(width-drawW)/2, oy=(height-drawH)/2;
  ctx.drawImage(image,ox,oy,drawW,drawH); if (!showGrid) return;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(scale,scale);
  for (let row=0; row<spriteSheet.config.rows; row++) for (let col=0; col<spriteSheet.config.columns; col++) {
    let rect: FrameRect; try { rect=spriteSheet.getFrameRect(row,col); } catch { continue; }
    if (row===selectedRow) { ctx.fillStyle=col===currentFrame?'rgba(255,184,77,.26)':'rgba(93,196,255,.12)'; ctx.fillRect(rect.x,rect.y,rect.width,rect.height); }
    ctx.strokeStyle=col===currentFrame&&row===selectedRow?'#ffb84d':'rgba(211,226,240,.8)'; ctx.lineWidth=(col===currentFrame&&row===selectedRow?2.2:1)/scale; ctx.strokeRect(rect.x,rect.y,rect.width,rect.height);
    ctx.fillStyle='rgba(8,13,22,.78)'; ctx.fillRect(rect.x+3/scale,rect.y+3/scale,24/scale,18/scale); ctx.fillStyle='#f6fbff'; ctx.font=`${11/scale}px ui-monospace,monospace`; ctx.fillText(`${col}`,rect.x+7/scale,rect.y+16/scale);
  }
  ctx.restore();
}

export function renderPreview(canvas: HTMLCanvasElement, image: HTMLImageElement | null, processedFrame: HTMLCanvasElement | null, spriteSheet: SpriteSheet | null, clip: AnimationClipData | null, currentFrame: number, previewZoom: number, debug: DebugFlags, collisionDraft?: { kind: CollisionKind; box: CollisionBox } | null): PreviewLayout | null {
  const ctx=canvas.getContext('2d'); if(!ctx) return null; const {width,height}=canvas; ctx.clearRect(0,0,width,height); drawChecker(ctx,width,height,20);
  if(!image||!spriteSheet||!clip||!processedFrame){drawEmpty(ctx,width,height,'Animation preview');return null;}
  const frameOffset=clip.frameOffsets[String(currentFrame)]??{x:0,y:0};
  const baseZoom=Math.min(width/Math.max(1,spriteSheet.frameWidth*1.8),height/Math.max(1,spriteSheet.frameHeight*1.6));
  const zoom=Math.max(.05,baseZoom*previewZoom); const anchorScreen={x:width/2+(clip.transform.offset.x+frameOffset.x)*zoom,y:height*.76+(clip.transform.offset.y+frameOffset.y)*zoom};
  if(debug.showGround){ctx.save();ctx.strokeStyle='rgba(121,223,169,.7)';ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(24,height*.76);ctx.lineTo(width-24,height*.76);ctx.stroke();ctx.restore();}
  const sx=(clip.transform.flipX?-1:1)*clip.transform.scale.x*zoom, sy=(clip.transform.flipY?-1:1)*clip.transform.scale.y*zoom;
  ctx.save(); ctx.translate(anchorScreen.x,anchorScreen.y); ctx.scale(sx,sy);
  ctx.drawImage(processedFrame,-clip.transform.anchor.x*spriteSheet.frameWidth,-clip.transform.anchor.y*spriteSheet.frameHeight,spriteSheet.frameWidth,spriteSheet.frameHeight);
  const lineScale=Math.max(Math.abs(sx),Math.abs(sy),.001);
  if(debug.showFrameBounds){ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=1/lineScale;ctx.strokeRect(-clip.transform.anchor.x*spriteSheet.frameWidth,-clip.transform.anchor.y*spriteSheet.frameHeight,spriteSheet.frameWidth,spriteSheet.frameHeight);}
  if(debug.showCollision){drawCollisionBoxes(ctx,clip,currentFrame,lineScale); if(collisionDraft) drawBox(ctx,collisionDraft.box,collisionDraft.kind,lineScale,true);}
  ctx.restore();
  if(debug.showAnchor){ctx.save();ctx.strokeStyle='#ff5f73';ctx.beginPath();ctx.arc(anchorScreen.x,anchorScreen.y,5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(anchorScreen.x-10,anchorScreen.y);ctx.lineTo(anchorScreen.x+10,anchorScreen.y);ctx.moveTo(anchorScreen.x,anchorScreen.y-10);ctx.lineTo(anchorScreen.x,anchorScreen.y+10);ctx.stroke();ctx.restore();}
  return {anchorScreen,zoom,frameWidth:spriteSheet.frameWidth,frameHeight:spriteSheet.frameHeight,scaleX:clip.transform.scale.x,scaleY:clip.transform.scale.y,flipX:clip.transform.flipX,flipY:clip.transform.flipY,anchor:clip.transform.anchor};
}

export function previewPointToFrame(point: Vec2, layout: PreviewLayout): Vec2 {
  const sx=(layout.flipX?-1:1)*layout.scaleX*layout.zoom, sy=(layout.flipY?-1:1)*layout.scaleY*layout.zoom;
  return {x:(point.x-layout.anchorScreen.x)/sx+layout.anchor.x*layout.frameWidth,y:(point.y-layout.anchorScreen.y)/sy+layout.anchor.y*layout.frameHeight};
}

export function createProcessedFrame(image: HTMLImageElement, rect: FrameRect, mode: 'nativeAlpha'|'chromaKey'|'none', color: string, tolerance: number): HTMLCanvasElement {
  const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(rect.width)); canvas.height=Math.max(1,Math.round(rect.height));
  const ctx=canvas.getContext('2d',{willReadFrequently:mode==='chromaKey'}); if(!ctx) return canvas;
  ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height); if(mode!=='chromaKey') return canvas;
  const rgb=parseHex(color), data=ctx.getImageData(0,0,canvas.width,canvas.height), limit=Math.max(0,tolerance);
  for(let i=0;i<data.data.length;i+=4){const dr=data.data[i]-rgb.r,dg=data.data[i+1]-rgb.g,db=data.data[i+2]-rgb.b;if(Math.sqrt(dr*dr+dg*dg+db*db)<=limit)data.data[i+3]=0;}
  ctx.putImageData(data,0,0); return canvas;
}

function drawCollisionBoxes(ctx:CanvasRenderingContext2D,clip:AnimationClipData,frame:number,scale:number):void{
  if(clip.collision.defaultBodyBox) drawBox(ctx,clip.collision.defaultBodyBox,'body',scale);
  const current=clip.collision.frames[String(frame)]; for(const box of current?.bodyBoxes??[]) drawBox(ctx,box,'body',scale); for(const box of current?.hurtboxes??[]) drawBox(ctx,box,'hurt',scale); for(const box of current?.hitboxes??[]) drawBox(ctx,box,'hit',scale);
}
function drawBox(ctx:CanvasRenderingContext2D,box:CollisionBox,kind:CollisionKind,scale:number,draft=false):void{const p={body:'#54b7ff',hurt:'#f1c75b',hit:'#ff6272'}[kind];ctx.save();ctx.strokeStyle=p;ctx.fillStyle=`${p}22`;ctx.lineWidth=(draft?2.5:1.7)/scale;if(draft)ctx.setLineDash([5/scale,4/scale]);ctx.fillRect(box.x,box.y,box.width,box.height);ctx.strokeRect(box.x,box.y,box.width,box.height);ctx.restore();}
function drawChecker(ctx:CanvasRenderingContext2D,w:number,h:number,size:number):void{ctx.fillStyle='#111923';ctx.fillRect(0,0,w,h);ctx.fillStyle='#15212d';for(let y=0;y<h;y+=size)for(let x=0;x<w;x+=size)if(((x/size)+(y/size))%2===0)ctx.fillRect(x,y,size,size);}
function drawEmpty(ctx:CanvasRenderingContext2D,w:number,h:number,label:string):void{ctx.fillStyle='rgba(224,236,248,.58)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='14px system-ui';ctx.fillText(label,w/2,h/2);}
function parseHex(hex:string):{r:number;g:number;b:number}{const n=hex.replace('#','').trim();if(!/^[0-9a-fA-F]{6}$/.test(n))return{r:0,g:0,b:0};return{r:parseInt(n.slice(0,2),16),g:parseInt(n.slice(2,4),16),b:parseInt(n.slice(4,6),16)};}

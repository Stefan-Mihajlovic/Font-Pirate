import AppKit
let out=CommandLine.arguments[1]
let w=1500,h=844
let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:w,pixelsHigh:h,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
func color(_ r:CGFloat,_ g:CGFloat,_ b:CGFloat)->NSColor{NSColor(calibratedRed:r/255,green:g/255,blue:b/255,alpha:1)}
func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ radius:CGFloat,_ c:NSColor){c.setFill();NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:radius,yRadius:radius).fill()}
func text(_ value:String,_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ c:NSColor,_ font:String="Helvetica"){(value as NSString).draw(at:NSPoint(x:x,y:y),withAttributes:[.font:NSFont(name:font,size:size) ?? NSFont.systemFont(ofSize:size),.foregroundColor:c])}
let ink=color(43,36,52),muted=color(121,113,126),purple=color(121,84,167)
rect(0,0,1500,844,0,color(246,243,237));rect(0,0,1500,12,0,purple)
text("TYPE PILOT",88,727,20,purple,"Helvetica-Bold");text("A BROWSER TYPOGRAPHY WORKSPACE",88,678,12,muted)
text("Good type.",80,471,98,ink,"Georgia");text("Great company.",80,353,88,purple,"Georgia-Italic")
text("Inspect. Pair. Make it yours.",88,264,24,muted)
rect(88,147,240,62,12,purple);text("Find your type  ↗",116,165,21,.white,"Helvetica-Bold")
text("LOCAL BY DESIGN    /    CHROME & EDGE",88,87,12,muted)
rect(862,89,551,648,16,color(226,216,236));rect(841,108,551,648,16,color(235,226,243))
text("THE ART OF A GOOD PAIR",878,701,13,muted);text("01 / Aa",1286,701,12,muted)
text("Aa",874,441,210,ink,"Georgia");text("&",1204,451,165,color(167,143,191),"Georgia-Italic")
rect(879,417,472,1,0,color(207,193,220))
text("Better together.",878,335,48,ink,"Georgia");text("A little character. A clear voice.",880,282,18,muted);text("Find the balance between the two.",880,251,18,muted)
rect(879,206,472,1,0,color(207,193,220));text("GEORGIA    +    SYSTEM SANS",880,165,13,muted)
NSGraphicsContext.restoreGraphicsState()
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:out))

import AppKit
let root = CommandLine.arguments[1]
for size in [16,32,48,128,512,1024] {
 let image = NSImage(size:NSSize(width:size,height:size))
 image.lockFocus()
 let scale=CGFloat(size)/128
 let transform=NSAffineTransform(); transform.scale(by:scale); transform.concat()
 let path=NSBezierPath(roundedRect:NSRect(x:0,y:0,width:128,height:128),xRadius:29,yRadius:29)
 NSGradient(starting:NSColor(calibratedRed:0.39,green:0.24,blue:0.59,alpha:1),ending:NSColor(calibratedRed:0.67,green:0.49,blue:0.83,alpha:1))!.draw(in:path,angle:50)
 NSColor(calibratedWhite:1,alpha:0.14).setStroke();let border=NSBezierPath(roundedRect:NSRect(x:1.5,y:1.5,width:125,height:125),xRadius:28,yRadius:28);border.lineWidth=1.5;border.stroke()
 let attrs:[NSAttributedString.Key:Any]=[.font:NSFont(name:"Georgia-Bold",size:83) ?? NSFont.boldSystemFont(ofSize:83),.foregroundColor:NSColor(calibratedRed:1,green:0.96,blue:0.88,alpha:1)]
 ("T" as NSString).draw(at:NSPoint(x:17,y:19),withAttributes:attrs)
 let attrs2:[NSAttributedString.Key:Any]=[.font:NSFont(name:"Georgia-Italic",size:64) ?? NSFont.systemFont(ofSize:64),.foregroundColor:NSColor(calibratedRed:0.91,green:0.82,blue:1,alpha:1)]
 ("p" as NSString).draw(at:NSPoint(x:70,y:14),withAttributes:attrs2)
 NSColor(calibratedRed:0.97,green:0.81,blue:0.5,alpha:1).setFill();NSBezierPath(ovalIn:NSRect(x:98,y:98,width:9,height:9)).fill()
 image.unlockFocus()
 let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState()
 NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
 image.draw(in:NSRect(x:0,y:0,width:size,height:size))
 NSGraphicsContext.restoreGraphicsState()
 try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:"\(root)/icons/icon\(size).png"))
}

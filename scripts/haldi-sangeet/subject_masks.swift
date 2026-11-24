// Writes one grayscale mask PNG per foreground subject that macOS Vision finds in an image
// (the same "lift subject" model Photos uses). Used by prepare_assets.py for clean cut-outs.
//
//   swift scripts/haldi-sangeet/subject_masks.swift <input.png> <output-prefix>
//   -> <output-prefix>-all.png, <output-prefix>-0.png, <output-prefix>-1.png, ...

import AppKit
import CoreImage
import Foundation
import Vision

func writePNG(_ buffer: CVPixelBuffer, to path: String) throws {
    let ci = CIImage(cvPixelBuffer: buffer)
    let ctx = CIContext()
    guard let cg = ctx.createCGImage(ci, from: ci.extent) else { throw NSError(domain: "mask", code: 1) }
    let rep = NSBitmapImageRep(cgImage: cg)
    guard let data = rep.representation(using: .png, properties: [:]) else { throw NSError(domain: "mask", code: 2) }
    try data.write(to: URL(fileURLWithPath: path))
}

let args = CommandLine.arguments
guard args.count == 3 else {
    print("usage: subject_masks <input> <output-prefix>")
    exit(1)
}
let url = URL(fileURLWithPath: args[1])
let handler = VNImageRequestHandler(url: url, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else {
    print("instances: 0")
    exit(0)
}
let all = result.allInstances
print("instances: \(all.count)")
try writePNG(try result.generateScaledMaskForImage(forInstances: all, from: handler), to: "\(args[2])-all.png")
for idx in all {
    let mask = try result.generateScaledMaskForImage(forInstances: IndexSet(integer: idx), from: handler)
    try writePNG(mask, to: "\(args[2])-\(idx).png")
}

// Renders Warsh ayahs with CoreText (the iOS text engine) and reports the
// characters the font has no glyph for (iOS draws those with a fallback font).
// Each sample is drawn twice: AVANT = one run (what iOS does by default),
// APRÈS = runs from splitAlmaghribiRuns(), missing codepoints in the fallback font.
// Input JSON: { "samples": [{ "label", "text", "runs": [{ "text", "fallback" }] }], "chars": String }
// Usage: swift render.swift <font> <fallback-font> <input.json> <output.png>
import AppKit
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Run: Decodable { let text: String; let fallback: Bool }
struct Sample: Decodable { let label: String; let text: String; let runs: [Run] }
struct Input: Decodable { let samples: [Sample]; let chars: String }

let args = CommandLine.arguments
func loadFont(_ path: String) -> CTFont {
  let descriptors = CTFontManagerCreateFontDescriptorsFromURL(URL(fileURLWithPath: path) as CFURL) as! [CTFontDescriptor]
  return CTFontCreateWithFontDescriptor(descriptors[0], 44, nil)
}
let quranFont = loadFont(args[1])
let fallbackFont = loadFont(args[2])
let input = try JSONDecoder().decode(Input.self, from: Data(contentsOf: URL(fileURLWithPath: args[3])))
let labelFont = CTFontCreateWithName("Menlo" as CFString, 16, nil)

// Coverage: every character of the corpus must have a glyph in the font.
var missing: [String] = []
for scalar in Set(input.chars.unicodeScalars).sorted(by: { $0.value < $1.value }) {
  var units = Array(String(scalar).utf16)
  var glyphs = [CGGlyph](repeating: 0, count: units.count)
  if !CTFontGetGlyphsForCharacters(quranFont, &units, &glyphs, units.count) {
    missing.append(String(format: "U+%04X %@", scalar.value, scalar.properties.name ?? "?"))
  }
}
print(missing.isEmpty ? "Couverture : tous les caractères ont un glyphe." : "Caractères sans glyphe (\(missing.count)) :\n  " + missing.joined(separator: "\n  "))

let rtl = NSMutableParagraphStyle()
rtl.baseWritingDirection = .rightToLeft
func line(_ parts: [(String, CTFont)], rightToLeft: Bool) -> CTLine {
  let s = NSMutableAttributedString()
  for (text, font) in parts {
    var attrs: [NSAttributedString.Key: Any] = [kCTFontAttributeName as NSAttributedString.Key: font]
    if rightToLeft { attrs[.paragraphStyle] = rtl }
    s.append(NSAttributedString(string: text, attributes: attrs))
  }
  return CTLineCreateWithAttributedString(s)
}

let rowHeight: CGFloat = 90
let width = 1800
let height = Int(CGFloat(input.samples.count) * rowHeight * 2 + 20)
let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 1, green: 0.98, blue: 0.93, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))

var y = CGFloat(height) - rowHeight + 10
for sample in input.samples {
  let rows = [
    ("AVANT  \(sample.label)", [(sample.text, quranFont)]),
    ("APRÈS  \(sample.label)", sample.runs.map { ($0.text, $0.fallback ? fallbackFont : quranFont) }),
  ]
  for (label, parts) in rows {
    ctx.textPosition = CGPoint(x: 16, y: y + 30)
    CTLineDraw(line([(label, labelFont)], rightToLeft: false), ctx)
    let textLine = line(parts, rightToLeft: true)
    ctx.textPosition = CGPoint(x: CGFloat(width) - 24 - CGFloat(CTLineGetTypographicBounds(textLine, nil, nil, nil)), y: y + 20)
    CTLineDraw(textLine, ctx)
    y -= rowHeight
  }
}

let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[4]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)

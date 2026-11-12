import CoreGraphics
import Foundation

let owner = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
let windows = (CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] ?? [])
    .filter { $0[kCGWindowOwnerName as String] as? String == owner }
    .map { window -> [String: Any] in
        let bounds = window[kCGWindowBounds as String] as? [String: CGFloat] ?? [:]
        return [
            "name": window[kCGWindowName as String] as? String ?? "",
            "layer": window[kCGWindowLayer as String] as? Int ?? 0,
            "bounds": ["x": bounds["X"] ?? 0, "y": bounds["Y"] ?? 0, "width": bounds["Width"] ?? 0, "height": bounds["Height"] ?? 0]
        ]
    }
let data = try JSONSerialization.data(withJSONObject: windows, options: [.prettyPrinted, .sortedKeys])
print(String(decoding: data, as: UTF8.self))

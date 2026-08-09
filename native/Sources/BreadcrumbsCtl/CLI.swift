import Foundation
import BreadcrumbsCore

enum CLI {
  static func output(_ value: Any) {
    let data = (try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys])) ?? Data("{}".utf8)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
  }

  static func fail(_ message: String, code: Int32) -> Never {
    output(["ok": false, "error": message])
    exit(code)
  }

  static func run(arguments: [String]) {
    guard let command = arguments.first else {
      fail("Usage: breadcrumbsctl status | cookies list [--domain domain] [--raw] | cookies get --key key --raw | audit list", code: 64)
    }

    if command == "status" {
      output([
        "ok": true,
        "available": FileManager.default.fileExists(atPath: BreadcrumbsCore.snapshotURL.path()),
        "updatedAt": BreadcrumbsCore.state()["updatedAt"] ?? NSNull(),
      ])
      exit(0)
    }

    guard let snapshot = try? BreadcrumbsCore.readSnapshot() else {
      fail("No encrypted extension snapshot is available", code: 69)
    }

    let raw = arguments.contains("--raw")
    if raw && command == "cookies" && !BreadcrumbsCore.authenticate() {
      fail("authentication failed", code: 77)
    }

    let domain = arguments.enumerated().first(where: { $0.element == "--domain" }).flatMap {
      arguments.indices.contains($0.offset + 1) ? arguments[$0.offset + 1] : nil
    }

    switch command {
    case "cookies":
      let cookies = (snapshot["cookies"] as? [[String: Any]] ?? []).filter {
        domain == nil || (($0["domain"] as? String)?.contains(domain!) ?? false)
      }
      if arguments.dropFirst().first == "get",
         let keyIndex = arguments.firstIndex(of: "--key"),
         arguments.indices.contains(keyIndex + 1),
         let item = cookies.first(where: { ($0["key"] as? String) == arguments[keyIndex + 1] }) {
        output(raw ? item : BreadcrumbsCore.redact(item))
      } else {
        output(raw ? cookies : cookies.map(BreadcrumbsCore.redact))
      }
    case "audit":
      output(snapshot["audit"] ?? [])
    default:
      fail("Unsupported command", code: 64)
    }
  }
}

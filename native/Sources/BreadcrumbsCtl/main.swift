import Foundation
import BreadcrumbsCore

func output(_ value: Any) {
  let data = (try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys])) ?? Data("{}".utf8)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data("\n".utf8))
}

let args = Array(CommandLine.arguments.dropFirst())
guard let command = args.first else {
  output(["error": "Usage: breadcrumbsctl status | cookies list [--domain domain] [--raw] | cookies get --key key --raw | audit list"])
  exit(64)
}

if command == "status" {
  output(["available": FileManager.default.fileExists(atPath: BreadcrumbsCore.snapshotURL.path()), "updatedAt": BreadcrumbsCore.state()["updatedAt"] ?? NSNull()])
  exit(0)
}

guard let snapshot = try? BreadcrumbsCore.readSnapshot() else { output(["error": "No encrypted extension snapshot is available"]); exit(69) }
let raw = args.contains("--raw")
if raw && command == "cookies" && !BreadcrumbsCore.authenticate() { output(["error": "authentication failed"]); exit(77) }
let domain = args.enumerated().first(where: { $0.element == "--domain" }).flatMap { args.indices.contains($0.offset + 1) ? args[$0.offset + 1] : nil }

switch command {
case "cookies":
  let cookies = (snapshot["cookies"] as? [[String: Any]] ?? []).filter { domain == nil || (($0["domain"] as? String)?.contains(domain!) ?? false) }
  if args.dropFirst().first == "get", let keyIndex = args.firstIndex(of: "--key"), args.indices.contains(keyIndex + 1), let item = cookies.first(where: { ($0["key"] as? String) == args[keyIndex + 1] }) { output(raw ? item : BreadcrumbsCore.redact(item)) }
  else { output(raw ? cookies : cookies.map(BreadcrumbsCore.redact)) }
case "audit": output(snapshot["audit"] ?? [])
default: output(["error": "Unsupported command"])
}

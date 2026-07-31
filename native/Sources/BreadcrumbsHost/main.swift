import Foundation
import BreadcrumbsCore

func readMessage() -> [String: Any]? {
  let input = FileHandle.standardInput
  let prefix = input.readData(ofLength: 4)
  guard prefix.count == 4 else { return nil }
  let size = prefix.withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) }.littleEndian
  let data = input.readData(ofLength: Int(size))
  return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
}

func writeMessage(_ value: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: value) else { return }
  var size = UInt32(data.count).littleEndian
  var output = Data(bytes: &size, count: 4)
  output.append(data)
  try? FileHandle.standardOutput.write(contentsOf: output)
}

while let request = readMessage() {
  let action = request["action"] as? String ?? ""
  switch action {
  case "status": writeMessage(["available": true, "updatedAt": BreadcrumbsCore.state()["updatedAt"] ?? NSNull()])
  case "snapshot":
    do { try BreadcrumbsCore.saveSnapshot(request["payload"] ?? [:]); writeMessage(["stored": true]) }
    catch { writeMessage(["stored": false, "error": error.localizedDescription]) }
  case "vaultPut":
    do {
      guard let id = request["id"] as? String, let payload = request["payload"] else { throw NSError(domain: "Breadcrumbs", code: 10) }
      var vault = try BreadcrumbsCore.readVault(); vault[id] = payload; try BreadcrumbsCore.saveVault(vault); writeMessage(["stored": true])
    } catch { writeMessage(["stored": false, "error": error.localizedDescription]) }
  case "vaultGet":
    do { let vault = try BreadcrumbsCore.readVault(); writeMessage(["entry": vault[request["id"] as? String ?? ""] ?? NSNull()]) }
    catch { writeMessage(["error": error.localizedDescription]) }
  case "vaultList":
    do { writeMessage(["entries": Array(try BreadcrumbsCore.readVault().values)]) }
    catch { writeMessage(["error": error.localizedDescription]) }
  case "vaultDelete":
    do { var vault = try BreadcrumbsCore.readVault(); vault.removeValue(forKey: request["id"] as? String ?? ""); try BreadcrumbsCore.saveVault(vault); writeMessage(["deleted": true]) }
    catch { writeMessage(["deleted": false, "error": error.localizedDescription]) }
  default: writeMessage(["error": "Unsupported action"])
  }
}

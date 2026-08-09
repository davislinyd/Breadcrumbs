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
  writeMessage(HostHandlers.handle(request))
}

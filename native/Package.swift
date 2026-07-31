// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "BreadcrumbsNative",
  platforms: [.macOS(.v13)],
  products: [
    .executable(name: "breadcrumbs-host", targets: ["BreadcrumbsHost"]),
    .executable(name: "breadcrumbsctl", targets: ["BreadcrumbsCtl"]),
  ],
  targets: [
    .target(name: "BreadcrumbsCore"),
    .executableTarget(name: "BreadcrumbsHost", dependencies: ["BreadcrumbsCore"]),
    .executableTarget(name: "BreadcrumbsCtl", dependencies: ["BreadcrumbsCore"]),
  ]
)

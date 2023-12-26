//
//  MRZScannerWrapper.swift
//  RNPassportPOC
//
//  Created by Jonathan Taveras Vargas on 12/24/23.
//

import Foundation
import CoreMedia

enum ULTMRZ_SDK_IMAGE_TYPE: Int {
  case RGB24 = 0
  case RGBA32 = 1
  case BGRA32 = 2
  case NV12 = 3
  case NV21 = 4
  case YUV420P = 5
  case YVU420P = 6
  case YUV422P = 7
  case YUV444P = 8
  case Y = 9
  case BGR24 = 10
}

/** `@objc` attribute exposes Swift methods to the Objective-C runtime**/
@objc(MRZScanner)
class MRZScanner: NSObject {
  private var mrzScannerWrapper: MRZScannerWrapper?
  private var sdkImageType: Int = ULTMRZ_SDK_IMAGE_TYPE.YUV420P.rawValue
  //  public static var emitter: RCTEventEmitter!
  
  override init() {
    print("INIT MRZ module!")
    super.init()
    //    MRZScanner.emitter = self
    initMRZ(withConfig: nil)
  }
  
  //  // Override the supported events method
  //  override func supportedEvents() -> [String]! {
  //    // Return the list of supported event names
  //    return ["MRZ_DETECTION_SUCCESSFUL", "MRZ_ANALYZING_PENDING", "MRZ_INITIALIZED", "MRZ_NOT_INITIALIZED", "MRZ_INIT_WITH_DEFAULT_CONFIG"]
  //  }
  
  @objc(initMRZ:)
  func initMRZ(withConfig jsonConfig: String?) {
    if (jsonConfig != nil){
      // Initialize the MRZScannerWrapper with the provided configuration
      mrzScannerWrapper = MRZScannerWrapper(jsonConfig: jsonConfig!)
      //      if(mrzScannerWrapper != nil){
      //        MRZScanner.emitter.sendEvent(withName: "MRZ_INITIALIZED", body: nil)
      //      }else {
      //        MRZScanner.emitter.sendEvent(withName: "MRZ_NOT_INITIALIZED", body: nil)
      //      }
      //      sdkImageType = imageType.intValue ?? ULTMRZ_SDK_IMAGE_TYPE.YUV420P.rawValue
    } else {
      initMRZWithDefaultConfig()
      //      MRZScanner.emitter.sendEvent(withName: "MRZ_INIT_WITH_DEFAULT_CONFIG", body: nil)
    }
  }
  
  @objc(initMRZWithDefaultConfig)
  func initMRZWithDefaultConfig(){
    let isPad = UIDevice.current.userInterfaceIdiom == .pad
    let defaultJsonConfigString = """
     {
         "debug_level": "info",
         "debug_write_input_image_enabled": false,
         "debug_internal_data_path": ".",
         "num_threads": -1,
         "gpgpu_enabled": true,
         "gpgpu_workload_balancing_enabled": \(isPad),
         "segmenter_accuracy": "high",
         "interpolation": "bilinear",
         "min_num_lines": 2,
         "roi": [0, 0, 0, 0],
         "min_score": 0.0
     }
     """
    
    initMRZ(withConfig: defaultJsonConfigString)
  }
  
  
  @objc
  func processFrames(_ imageType: Int,
                     withImageData imageData: UnsafeMutableRawPointer ,
                     widthImage imageWidthInSamples: Int,
                     heightImage imageHeightInSamples: Int,
                     imageStride imageStrideInSamples: Int = 0,
                     imageOrientation imageExifOrientation: Int = 1) -> String {
    guard let scanner = mrzScannerWrapper else {
      print("Scanner is not initialized.")
      return "Scanner is not initialized."
    }
    
//    print("Scanner is initialized and redy to process the frames")
//    // Print statements for each parameter
//    print("Image Type: \(imageType)")
//    print("Image Data: \(imageData)")
//    print("Image Width In Samples: \(imageWidthInSamples)")
//    print("Image Height In Samples: \(imageHeightInSamples)")
//    print("Image Stride In Samples: \(imageStrideInSamples)")
//    print("Image EXIF Orientation: \(imageExifOrientation)")
//    
    // for test purpose
//    let dict: [String: Any] = [
//      "imageType": imageType,
//      "imageData": imageData,
//      "imageWidthInSamples": imageWidthInSamples,
//      "imageHeightInSamples": imageHeightInSamples,
//      "imageStrideInSamples": imageStrideInSamples,
//      "imageExifOrientation": imageExifOrientation
//    ]
//    
    let scanResults = mrzScannerWrapper?.processImage(withType: imageType, imageData: imageData, imageWidthInSamples: imageWidthInSamples, imageHeightInSamples: imageHeightInSamples) ?? "error processing image frame"
    return scanResults
    
  }
  
  /**
   Specifies whether this module should be initialized on the main thread.
   
   This is essential if the module interacts with UI or requires access to UIKit, as these interactions
   must occur on the main thread. It ensures that the module is fully set up and ready before any JavaScript code.
   
   `Note:` Returning `true` may have performance implications, as it can delay the React Native. JavaScript thread initialization until the module is fully set up. Use this setting only if necessary
   `Note:` if we're using `RCTEventEmmitter` class we need to `override` the `requiresMainQueueSetup` method because it already exist in the `RCTEventEmmitter` class
   */
  @objc(requiresMainQueueSetup)
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
}

//
//  MRZFrameProcessorPlugin.swift
//  RNPassportPOC
//
//  Created by Jonathan Taveras Vargas on 12/25/23.
//

import Foundation
import VisionCamera
import UIKit

@objc(MRZFrameProcessorPlugin)
public class MRZFrameProcessorPlugin: FrameProcessorPlugin {
  private var mrzScanner: MRZScanner = MRZScanner()
  
  public override init(options: [AnyHashable : Any]! = [:]) {
    super.init(options: options)
  }
  
  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any {
    let buffer = frame.buffer
    let orientation = frame.orientation
    guard let imageBuffer = CMSampleBufferGetImageBuffer(buffer) else {
      print("Failed to get image buffer from sample buffer")
      return "Failed to get image buffer from sample buffer"
    }
    // Lock the buffer to access the raw pixel data
    CVPixelBufferLockBaseAddress(imageBuffer, [])
    
    
    // Get the bufffer bounds
    let bufferImageWidth = CVPixelBufferGetWidth(imageBuffer)
    let bufferImageHeight = CVPixelBufferGetHeight(imageBuffer)
    
    // Get the raw pixel data from the image buffer
    guard let imageData = CVPixelBufferGetBaseAddress(imageBuffer) else {
      CVPixelBufferUnlockBaseAddress(imageBuffer, [])
      print("Failed to get image data from pixel buffer")
      return ""
    }
    
    let imageStride = CVPixelBufferGetBytesPerRow(imageBuffer)
    
    //    we have UnsafeMutableRawPointer for image data
    let scanResults = mrzScanner.processFrames(5, withImageData: imageData, widthImage: bufferImageWidth, heightImage: bufferImageHeight, imageStride: 0, imageOrientation: orientation.rawValue)
    
    // Unlock the buffer after accessing the raw pixel data
    CVPixelBufferUnlockBaseAddress(imageBuffer, [])
    
    return scanResults
  }
}

//
//  MRZFrameProcessorPlugin.m
//  RNPassportPOC
//
//  Created by Jonathan Taveras Vargas on 12/25/23.
//

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#import "RNPassportPOC-Swift.h" // <--- replace "YOUR_XCODE_PROJECT_NAME" with the actual value of your xcode project name

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(MRZFrameProcessorPlugin, MRZScan)

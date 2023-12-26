//
//  MRZScanner.m
//  RNPassportPOC
//
//  Created by J.T on 12/24/23.
//

#import <Foundation/Foundation.h>

#import "CoreMedia/CMSampleBuffer.h"
#import "React/RCTBridgeModule.h"



@interface RCT_EXTERN_MODULE(MRZScanner, NSObject)

/**
  `RCT_EXTERN_METHOD` in React Native allows exposing native methods to the JavaScript bridge.
 
  It follows the syntax: `RCT_EXTERN_METHOD(methodName:(paramType)internalParamName ...)`
  
  For one argument: `RCT_EXTERN_METHOD(methodName:(ParamType)internalParamName)`
 
  For multiple arguments: `RCT_EXTERN_METHOD(methodName:(ParamType1)internalParamName1 [externalParamName2]:(ParamType2)internalParamName2 ...)`
 */
//RCT_EXTERN_METHOD(salute:(RCTResponseSenderBlock) callback)
//RCT_EXTERN_METHOD(saluteAsync:(RCTPromiseResolveBlock) resolve rejecter:(RCTPromiseRejectBlock) reject)


RCT_EXTERN_METHOD(initMRZ:(NSString *) jsonConfig)
//RCT_EXTERN_METHOD(processFrames:(NSInteger) imageType withImageData:(CMSampleBufferRef) imageData widthImage:(NSInteger) imageWidthInSamples heightImage:(NSInteger) imageHeightInSamples imageStride:(NSInteger) imageStrideInSamples  imageOrientation:(NSInteger) imageExifOrientation)

@end

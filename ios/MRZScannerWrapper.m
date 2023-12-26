//
//  MRZScannerWrapper.m
//  RNPassportPOC
//
//  Created by Jonathan Taveras Vargas on 12/24/23.
//

// MRZScannerWrapper.mm
#import "MRZScannerWrapper.h"
#include "ultimate_mrz-sdk/ultimateMRZ-SDK-API-PUBLIC.h"

@interface MRZScannerWrapper ()
@end

@implementation MRZScannerWrapper

- (instancetype)initWithJsonConfig:(NSString *)jsonConfig {
    self = [super init];
    if (self) {
        // Convert NSString to std::string
        std::string stdJsonConfig = jsonConfig.UTF8String;
        
        // Call C++ initialize function
        ultimateMrzSdk::UltMrzSdkResult result = ultimateMrzSdk::UltMrzSdkEngine::init(stdJsonConfig.c_str());
        
        // Handle result
    }
    return self;
}

- (NSString *)processImageWithType:(NSInteger)imageType
                         imageData:(void *)imageData
                   imageWidthInSamples:(size_t)imageWidthInSamples
                  imageHeightInSamples:(size_t)imageHeightInSamples {
    
    // Call C++ process function
    ultimateMrzSdk::UltMrzSdkResult result = ultimateMrzSdk::UltMrzSdkEngine::process(
        static_cast<ultimateMrzSdk::ULTMRZ_SDK_IMAGE_TYPE>(imageType),
        imageData,
        imageWidthInSamples,
        imageHeightInSamples
    );
    
    // Convert result to NSString and return
    return [NSString stringWithUTF8String:result.json()];
}

- (NSString *)deinitialize {
    // Call C++ deinitialize function
    ultimateMrzSdk::UltMrzSdkResult result = ultimateMrzSdk::UltMrzSdkEngine::deInit();
    
    // Convert result to NSString and return
    return [NSString stringWithUTF8String:result.json()];
}

@end


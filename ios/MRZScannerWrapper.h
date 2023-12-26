//
//  MRZScannerWrapper.h
//  RNPassportPOC
//
//  Created by Jonathan Taveras Vargas on 12/24/23.
//

#import <Foundation/Foundation.h>

// Forward declaration of C++ class
#ifdef __cplusplus
namespace ultimateMrzSdk {
    class UltMrzSdkResult;
}
#endif

NS_ASSUME_NONNULL_BEGIN

@interface MRZScannerWrapper : NSObject

- (instancetype)initWithJsonConfig:(NSString *)jsonConfig;

- (NSString *)processImageWithType:(NSInteger)imageType
                         imageData:(void *)imageData
                   imageWidthInSamples:(size_t)imageWidthInSamples
                  imageHeightInSamples:(size_t)imageHeightInSamples;

- (NSString *)deinitialize;

@end

NS_ASSUME_NONNULL_END

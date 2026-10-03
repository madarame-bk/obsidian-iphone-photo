#import <AppKit/AppKit.h>
NS_ASSUME_NONNULL_BEGIN
@interface PhotoCapture : NSObject
- (void)startWithSimulation:(nullable NSString *)simulation
                 completion:(void (^)(NSString *status, NSData *_Nullable image,
                                      NSString *_Nullable message))completion;
- (void)cancel;
+ (NSDictionary<NSString *, id> *)diagnostics;
@end
NS_ASSUME_NONNULL_END

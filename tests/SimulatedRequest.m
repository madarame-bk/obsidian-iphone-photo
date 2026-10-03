#import <AppKit/AppKit.h>

// Tests exercise the same request lifecycle as the system request, without
// starting an iPhone camera or touching the general clipboard.
@interface PhotoSimulatedRequest : NSObject
@property NSString *mode;
@property BOOL isFinished;
@property BOOL isCancelled;
@property NSError *error;
@property NSArray *items;
@end
@implementation PhotoSimulatedRequest
- (void)start {
    if ([self.mode isEqual:@"wait"])
        return;
    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, 250 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
            self.isCancelled = [self.mode isEqual:@"cancel"];
            if ([self.mode isEqual:@"error"])
                self.error = [NSError
                    errorWithDomain:@"PhotoSimulation"
                               code:1
                           userInfo:@{NSLocalizedDescriptionKey : @"Simulated connection failure"}];
            self.items = [self.mode isEqual:@"success"] ? @[ @"simulated image" ] : @[];
            self.isFinished = YES;
        });
}
- (void)cancel {
    self.isCancelled = YES;
    self.isFinished = YES;
}
- (void)writeToPasteboard:(NSPasteboard *)pasteboard {
    NSBitmapImageRep *bitmap =
        [[NSBitmapImageRep alloc] initWithBitmapDataPlanes:NULL
                                                pixelsWide:320
                                                pixelsHigh:200
                                             bitsPerSample:8
                                           samplesPerPixel:4
                                                  hasAlpha:YES
                                                  isPlanar:NO
                                            colorSpaceName:NSDeviceRGBColorSpace
                                               bytesPerRow:0
                                              bitsPerPixel:0];
    unsigned char *pixels = bitmap.bitmapData;
    for (NSInteger y = 0; y < 200; y++)
        for (NSInteger x = 0; x < 320; x++) {
            unsigned char *pixel = pixels + y * bitmap.bytesPerRow + x * 4;
            pixel[0] = (unsigned char)(x * 255 / 319);
            pixel[1] = (unsigned char)(y * 255 / 199);
            pixel[2] = 153;
            pixel[3] = 255;
        }
    NSImage *image = [[NSImage alloc] initWithSize:NSMakeSize(320, 200)];
    [image addRepresentation:bitmap];
    [pasteboard writeObjects:@[ image ]];
}
@end

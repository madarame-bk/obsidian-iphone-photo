#import "ContinuityBridge.h"
#import <dlfcn.h>

// SidecarCore is private. Check each selector before calling into it.
@interface NSObject (PhotoSystemRequest)
- (NSArray *)devices;
- (id)makeRequestToDevice:(id)device;
- (void)start;
- (void)cancel;
- (BOOL)isFinished;
- (BOOL)isCancelled;
- (NSError *)error;
- (NSArray *)items;
- (void)writeToPasteboard:(NSPasteboard *)pasteboard;
@end

@interface PhotoCapture ()
@property(nonatomic, strong) id service;
@property(nonatomic, strong) id request;
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, copy) void (^completion)(NSString *, NSData *, NSString *);
@property(nonatomic) BOOL finished;
@property(nonatomic, strong) NSDate *deadline;
@end
@implementation PhotoCapture
+ (Class)serviceClass {
    dlopen("/System/Library/PrivateFrameworks/SidecarCore.framework/SidecarCore", RTLD_LAZY);
    return NSClassFromString(@"SidecarService_Camera");
}
+ (NSDictionary *)diagnostics {
    Class cls = [self serviceClass];
    if (!cls)
        return @{@"available" : @NO};
    id service = [cls new];
    if (![service respondsToSelector:@selector(devices)] ||
        ![service respondsToSelector:@selector(makeRequestToDevice:)])
        return @{@"available" : @NO};
    NSArray *devices = [service devices];
    id request = devices.count ? [service makeRequestToDevice:devices.firstObject] : nil;
    NSMutableArray *missing = [NSMutableArray array];
    for (NSString *name in @[
             @"start", @"cancel", @"isFinished", @"isCancelled", @"error", @"items",
             @"writeToPasteboard:"
         ])
        if (request && ![request respondsToSelector:NSSelectorFromString(name)])
            [missing addObject:name];
    return @{
        @"available" : @(cls != nil),
        @"devices" : @(devices.count),
        @"requestCompatible" : @(request && !missing.count),
        @"missing" : missing
    };
}
- (void)finish:(NSString *)status image:(NSData *)image message:(NSString *)message {
    if (self.finished)
        return;
    self.finished = YES;
    [self.timer invalidate];
    self.timer = nil;
    void (^callback)(NSString *, NSData *, NSString *) = self.completion;
    self.completion = nil;
    callback(status, image, message);
    self.request = nil;
    self.service = nil;
}
- (void)startWithSimulation:(NSString *)simulation
                 completion:(void (^)(NSString *, NSData *, NSString *))completion {
    self.completion = completion;
    if (simulation) {
        if (![@[ @"success", @"cancel", @"error", @"wait" ] containsObject:simulation]) {
            [self finish:@"error" image:nil message:@"Invalid simulation mode"];
            return;
        }
#ifdef PHOTO_SIMULATION
        id request = [NSClassFromString(@"PhotoSimulatedRequest") new];
        [request setValue:simulation forKey:@"mode"];
        self.request = request;
#else
        [self finish:@"error" image:nil message:@"Simulation is only available in test builds."];
        return;
#endif
    } else {
        Class cls = [PhotoCapture serviceClass];
        if (!cls) {
            [self finish:@"error"
                   image:nil
                 message:@"This macOS version does not provide the expected Continuity Camera "
                         @"interface."];
            return;
        }
        id service = [cls new];
        self.service = service;
        if (![service respondsToSelector:@selector(devices)] ||
            ![service respondsToSelector:@selector(makeRequestToDevice:)]) {
            [self finish:@"error" image:nil message:@"The macOS camera interface has changed."];
            return;
        }
        NSArray *devices = [service devices];
        if (!devices.count) {
            [self finish:@"error"
                   image:nil
                 message:@"No nearby iPhone is available. Check Finder’s Import from iPhone menu."];
            return;
        }
        self.request = [service makeRequestToDevice:devices.firstObject];
    }
    for (NSString *name in @[
             @"start", @"cancel", @"isFinished", @"isCancelled", @"error", @"items",
             @"writeToPasteboard:"
         ]) {
        if (![self.request respondsToSelector:NSSelectorFromString(name)]) {
            [self finish:@"error"
                   image:nil
                 message:@"The macOS capture request interface has changed."];
            return;
        }
    }
    self.deadline = [NSDate dateWithTimeIntervalSinceNow:180];
    [self.request start];
    __weak PhotoCapture *weakSelf = self;
    self.timer = [NSTimer timerWithTimeInterval:0.1
                                        repeats:YES
                                          block:^(NSTimer *__unused timer) {
                                              [weakSelf checkRequest];
                                          }];
    [[NSRunLoop mainRunLoop] addTimer:self.timer forMode:NSRunLoopCommonModes];
    [self checkRequest];
}
- (void)checkRequest {
    if (self.finished)
        return;
    if ([self.request isCancelled]) {
        [self finish:@"cancelled" image:nil message:nil];
        return;
    }
    if ([self.request isFinished]) {
        NSError *error = [self.request error];
        if (error) {
            BOOL cancelled =
                ([error.domain isEqual:NSCocoaErrorDomain] && error.code == NSUserCancelledError) ||
                ([error.domain isEqual:NSURLErrorDomain] && error.code == NSURLErrorCancelled);
            [self finish:cancelled ? @"cancelled" : @"error"
                   image:nil
                 message:error.localizedDescription];
            return;
        }
        if (![[self.request items] count]) {
            [self finish:@"cancelled" image:nil message:nil];
            return;
        }
        NSPasteboard *pasteboard = [NSPasteboard pasteboardWithUniqueName];
        [self.request writeToPasteboard:pasteboard];
        NSImage *image = [[NSImage alloc] initWithPasteboard:pasteboard];
        NSData *tiff = image.TIFFRepresentation;
        NSBitmapImageRep *bitmap = tiff ? [[NSBitmapImageRep alloc] initWithData:tiff] : nil;
        NSData *png = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [pasteboard releaseGlobally];
        [self finish:png ? @"done" : @"error"
               image:png
             message:png ? nil : @"macOS returned no readable photo."];
        return;
    }
    if ([self.deadline timeIntervalSinceNow] <= 0) {
        [self.request cancel];
        [self finish:@"error" image:nil message:@"iPhone capture timed out."];
    }
}
- (void)cancel {
    if (!self.finished) {
        [self.request cancel];
        [self finish:@"cancelled" image:nil message:nil];
    }
}
@end

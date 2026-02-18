//
//  WeatherKitManagerBridge.m
//  CalmParentApp
//
//  React Native bridge for WeatherKitManager
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WeatherKitManager, NSObject)

RCT_EXTERN_METHOD(getWeather:(double)latitude
                  longitude:(double)longitude
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getWeatherByCity:(NSString *)cityName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearCache:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

//
//  WeatherKitManager.swift
//  CalmParentApp
//
//  Apple WeatherKit integration with 15-minute caching
//

import Foundation
import WeatherKit
import CoreLocation
import React

@available(iOS 16.0, *)
@objc(WeatherKitManager)
class WeatherKitManager: NSObject {

    private let weatherService = WeatherService.shared
    private let geocoder = CLGeocoder()

    // Cache structure
    private struct CachedWeather {
        let data: [String: Any]
        let timestamp: Date
        let location: CLLocation
    }

    private var cache: CachedWeather?
    private let cacheValidityDuration: TimeInterval = 15 * 60 // 15 minutes

    // MARK: - Public Methods

    @objc
    func getWeather(
        _ latitude: Double,
        longitude: Double,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                let location = CLLocation(latitude: latitude, longitude: longitude)

                // Check cache
                if let cachedData = getCachedWeather(for: location) {
                    resolve(cachedData)
                    return
                }

                // Fetch fresh data
                let weather = try await weatherService.weather(for: location)
                let weatherData = formatWeatherData(weather, location: location)

                // Update cache
                cache = CachedWeather(
                    data: weatherData,
                    timestamp: Date(),
                    location: location
                )

                resolve(weatherData)
            } catch {
                reject("WEATHER_ERROR", "Failed to fetch weather: \(error.localizedDescription)", error)
            }
        }
    }

    @objc
    func getWeatherByCity(
        _ cityName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                // Geocode city name to coordinates
                let placemarks = try await geocoder.geocodeAddressString(cityName)

                guard let location = placemarks.first?.location else {
                    reject("GEOCODE_ERROR", "Could not find location for city: \(cityName)", nil as NSError?)
                    return
                }

                // Check cache
                if let cachedData = getCachedWeather(for: location) {
                    resolve(cachedData)
                    return
                }

                // Fetch fresh data
                let weather = try await weatherService.weather(for: location)
                var weatherData = formatWeatherData(weather, location: location)

                // Add city name to result
                weatherData["city"] = placemarks.first?.locality ?? cityName

                // Update cache
                cache = CachedWeather(
                    data: weatherData,
                    timestamp: Date(),
                    location: location
                )

                resolve(weatherData)
            } catch {
                reject("WEATHER_ERROR", "Failed to fetch weather for city: \(error.localizedDescription)", error)
            }
        }
    }

    @objc
    func clearCache(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        cache = nil
        resolve(["success": true])
    }

    // MARK: - Helper Methods

    private func getCachedWeather(for location: CLLocation) -> [String: Any]? {
        guard let cache = cache else { return nil }

        // Check if cache is still valid (within 15 minutes)
        let timeSinceCache = Date().timeIntervalSince(cache.timestamp)
        guard timeSinceCache < cacheValidityDuration else { return nil }

        // Check if location is similar (within ~1km)
        let distance = location.distance(from: cache.location)
        guard distance < 1000 else { return nil }

        return cache.data
    }

    private func formatWeatherData(_ weather: Weather, location: CLLocation) -> [String: Any] {
        let current = weather.currentWeather

        return [
            "temperature": current.temperature.value, // Celsius
            "temperatureFahrenheit": (current.temperature.value * 9/5) + 32,
            "condition": current.condition.description,
            "conditionCode": getConditionCode(current.condition),
            "icon": getWeatherIcon(current.condition),
            "humidity": weather.currentWeather.humidity * 100, // Percentage
            "windSpeed": current.wind.speed.value, // m/s
            "uvIndex": current.uvIndex.value,
            "timestamp": current.date.timeIntervalSince1970,
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "isDaylight": current.isDaylight,
            "cached": false
        ]
    }

    private func getConditionCode(_ condition: WeatherCondition) -> String {
        switch condition {
        case .clear: return "clear"
        case .cloudy: return "cloudy"
        case .mostlyClear: return "mostly_clear"
        case .mostlyCloudy: return "mostly_cloudy"
        case .partlyCloudy: return "partly_cloudy"
        case .rain: return "rain"
        case .heavyRain: return "heavy_rain"
        case .snow: return "snow"
        case .sleet: return "sleet"
        case .hail: return "hail"
        case .freezingRain: return "freezing_rain"
        case .drizzle: return "drizzle"
        case .thunderstorms: return "thunderstorms"
        case .foggy: return "fog"
        case .haze: return "haze"
        case .smoky: return "smoky"
        case .windy: return "windy"
        default: return "unknown"
        }
    }

    private func getWeatherIcon(_ condition: WeatherCondition) -> String {
        switch condition {
        case .clear: return "☀️"
        case .mostlyClear: return "🌤️"
        case .partlyCloudy: return "⛅"
        case .mostlyCloudy: return "🌥️"
        case .cloudy: return "☁️"
        case .rain, .drizzle: return "🌧️"
        case .heavyRain: return "⛈️"
        case .thunderstorms: return "⛈️"
        case .snow: return "❄️"
        case .sleet, .hail, .freezingRain: return "🌨️"
        case .foggy, .haze, .smoky: return "🌫️"
        case .windy: return "💨"
        default: return "☁️"
        }
    }

    // MARK: - React Native Bridge

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

# Chapter 9: Location Auto-Detection Engine, Map Tracker & Frontend Architecture

Sunotal features a **BigBasket-Style Hyperlocal Location & Live Delivery Engine**, combining HTML5 Geolocation, Leaflet OpenStreetMap vector mapping, Nominatim reverse geocoding, and a dedicated `delivery-service` microservice.

---

## 1. Leaflet Pinpoint Map Location Picker (`InteractiveMapPickerModal`)

- **OpenStreetMap Interactive Vector Map**: Customers can drag a map pin marker across an interactive map interface to pinpoint their exact delivery address.
- **Nominatim Reverse Geocoding Lookup**: Converts latitude and longitude coordinates in real-time to building name, street, locality, city, state, and pincode.
- **Address Book & Tagging**: Pinned addresses can be tagged (*Home*, *Work*, *Corporate Office*, *Other*) and saved to PostgreSQL via `delivery-service` (`POST /api/user/addresses`).

---

## 2. Live Order Delivery Map Tracking Engine (`LiveDeliveryMapTracker`)

- **Route Interpolation & Moving Driver Pin**: Renders an interactive Leaflet map displaying:
  - **Fulfillment Center Origin Pin**: Bengaluru Central Hub ($12.9783, 77.6408$).
  - **Customer Destination Pin**: Pinned customer delivery address.
  - **Animated Driver Pin**: Real-time vector route simulation of an electric delivery vehicle moving along the route.
- **Live Telemetry & Driver Card**:
  - Displays remaining distance in km, current driver speed ($28\text{ km/h}$), and ETA countdown in minutes.
  - Includes driver profile card (Driver Name, Photo, Rating, Vehicle Number, and 1-Click Call Driver action).

---

## 3. Dedicated `delivery-service` Microservice (Port 5006)

- **Architecture**: Independent Node.js 20 microservice on Port `5006`.
- **Exposed Endpoints**:
  - `GET /api/user/addresses`: List saved addresses.
  - `POST /api/user/addresses`: Save map-pinned delivery address.
  - `DELETE /api/user/addresses/:id`: Delete saved address.
  - `GET /api/delivery/slots`: Returns available delivery windows (*"Express 2-Hour Delivery"*, *"Today Morning 7-9 AM"*).
  - `GET /api/delivery/track/:orderId`: Returns live driver GPS coordinates, route polyline points, speed, ETA, and driver details.

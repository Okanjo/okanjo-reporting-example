# Okanjo API Reporting Example

This project demonstrates how to use the Okanjo Node.js SDK to retrieve a commission report via the Okanjo API.

## Running The Example

1. You'll need a copy of this project. Either download a ZIP from GitHub or clone the repository.
2. Install the dependencies: 
   ```sh
   npm install
   ```
3. Run the example using environment variables:
   ```sh
   EMAIL=your@email.tld PASSWORD="yourpass" API_KEY=yourapikey node index.js
   ```

The example will write a JSON file of the last 30 days of commissions. 
Additionally, it will output a simplified CSV to show that records can be mapped or iterated upon.
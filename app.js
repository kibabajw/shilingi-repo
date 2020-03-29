var { resolve } = require("path");
var express = require("express");
var env = require("dotenv").config({ path: "./.env" });
const port = process.env.PORT || 4000;
// 1. Set up your server to make calls to PayPal

// 1a. Import the SDK package
const paypal = require("@paypal/checkout-server-sdk");
// 1b. Import the PayPal SDK client that was created in `Set up Server-Side SDK`.
/**
 *
 * PayPal HTTP client dependency
 */
const paypalClient = require("./Common/payPalClient");

var app = express();

app.get("/", function(req, res) {
  const path = resolve(process.env.STATIC_DIR + "custom.html");
  res.sendFile(path);
});

app.get("/buy/:id", function(req, res, next) {});

app.post("/success", function(req, res) {
  res.send("<h3>Payment was successful</h3>");
});

app.get("/failed", function(req, res) {
  res.send("<h3>Could not complete payment</h3>");
});

// START PAYPAL SERVER LOGIC =========================================
// 2. Set up your server to receive a call from the client
app.post("/payup", async function handleRequest(req, res) {
  // 3. Call PayPal to set up a transaction
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    // start here
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "01.10"
        }
      }
    ]
    // end here
  });
  let order;
  try {
    order = await paypalClient.client().execute(request);
  } catch (err) {
    // 4. Handle any errors from the call
    console.log(err);
    return res.send(500);
  }
  // 5. Return a successful response to the client with the order ID
  res.status(200).json({
    orderID: order.result.id
  });
});

app.post("/gettransactiondetails", async function(req, res) {
  // 2a. Get the order ID from the request body
  const orderID = req.body.orderID;

  // 3a. Call PayPal to get the transaction details
  let request = new paypal.orders.OrdersGetRequest(orderID);
  let order;
  try {
    order = await paypalClient.client().execute(request);
  } catch (err) {
    // 4. Handle any errors from the call
    console.error(err);
    return res.send(500);
  }
  // 5. Validate the transaction details are as expected
  if (order.result.purchase_units[0].amount.value !== "220.00") {
    return res.sendStatus(400);
  }
  // 6. Save the transaction in your database
  // await database.saveTransaction(orderID)

  // 7. Return a successful response to the client
  return res.send(200);
});

app.post("/capturetransaction/:orderID", async function(req, res) {
  // 2a. Get the order ID from the request body
  const orderID = req.params.orderID;
  // 3. Call PayPal to capture the order
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});
  let capture;
  try {
    capture = await paypalClient.client().execute(request);
    // 4. Save the capture ID to your database. Implement logic to save capture to your database for future reference.
    const captureID = capture.result.purchase_units[0].payments.captures[0].id;
    // await database.saveCaptureID(captureID);
  } catch (err) {
    // 5. Handle any errors from the call
    console.error(err);
    return res.send(500);
  }
  // 6. Return a successful response to the client
  console.log("CAPTURED TRANSACTION = ", JSON.stringify(capture));
  res.status(200).json({ capture });
});
// END PAYPAL SERVER LOGIC ===========================================

app.listen(port, function() {
  console.log("Running on port 4000");
});

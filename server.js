import express from "express";
import cors from "cors"; // Import using ES module syntax

// const PORT = 8080;
// const HOST = "192.168.100.4";

import {
  authenticateUser,
  shareCopyOfLedgerWithAccessKey,
  createEntryByParticularID,
  createLedgerByUserID,
  createNewUser,
  createParticularByLedgerID,
  createPDFSpecificLedger,
  deleteEntryByEntryID,
  deleteLedgerByLedgerID,
  deleteParticularByParticularID,
  getAccessKeyForLedger,
  getAllEntriesByParticularID,
  getAllLedgersByUserID,
  getAllParticularsByLedgerID,
  getSumAmountFromSpecificLedger,
  getSumAmountFromSpecificParticular,
  updateEntryByEntryID,
  updateLedgerByLedgerID,
  updateParticularByParticularID,
} from "./database.js";

const app = express();
app.use(express.json());

// USERS
app.post("/login", async (req, res) => {
  const { mobile_phone_number } = req.body;

  console.log("Login request received", req.body);

  try {
    const { user, token } = await authenticateUser(mobile_phone_number);
    res.status(200).send({ user, token });
  } catch (error) {
    res.status(400).send({ error: error.message });
    console.log("Login error", error.message);
  }
});
app.post("/register", async (req, res) => {
  const { user_name, mobile_phone_number } = req.body;

  console.log("Incoming request: ", req.body);

  if (!user_name || !mobile_phone_number) {
    return res
      .status(400)
      .json({ error: "User Name and Mobile Number is required" });
  }

  try {
    const result = await createNewUser(user_name, mobile_phone_number);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// LEDGERS
app.get("/ledgers/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  const clients = await getAllLedgersByUserID(user_id);
  res.send(clients);
});
app.post("/ledgers", async (req, res) => {
  const { user_id, ledger_name } = req.body;

  console.log("Incoming request: ", req.body);
  if (!user_id || !ledger_name) {
    return res
      .status(400)
      .json({ error: "User ID and Ledger Name are required" });
  }
  try {
    const result = await createLedgerByUserID(user_id, ledger_name);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating ledger:", error);
    res.status(500).json({ error: "Failed to create ledger" });
  }
});
app.put("/ledgers/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  const { ledger_name } = req.body;
  try {
    const result = await updateLedgerByLedgerID(ledger_id, ledger_name);
    res.send(result);
  } catch (error) {
    console.error("Error updating ledger:", error);
    res.status(500).send({ error: "Failed to update ledger" });
  }
});
app.delete("/ledgers/:user_id/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  const user_id = req.params.user_id;
  try {
    const result = await deleteLedgerByLedgerID(user_id, ledger_id);
    res.send(result);
  } catch (error) {
    console.error("Error deleting ledger:", error);
    res.status(500).send({ error: "Failed to delete ledger" });
  }
});

// PARTICULARS
app.get("/particulars/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  const clients = await getAllParticularsByLedgerID(ledger_id);
  res.send(clients);
});
app.post("/particulars", async (req, res) => {
  const { ledger_id, particular_name } = req.body;

  console.log("Incoming request: ", req.body);
  try {
    const result = await createParticularByLedgerID(ledger_id, particular_name);
    res.status(201).send(result); // Status 201 for resource creation success
  } catch (error) {
    console.error("Error creating particular:", error);
    res.status(500).send({ error: "Failed to create particular" });
  }
});
app.put("/particulars/:particular_id", async (req, res) => {
  const particular_id = req.params.particular_id;
  const { particular_name } = req.body;
  try {
    const result = await updateParticularByParticularID(
      particular_id,
      particular_name
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating particular:", error);
    res.status(500).send({ error: "Failed to update particular" });
  }
});
app.delete("/particulars/:particular_id", async (req, res) => {
  const particular_id = req.params.particular_id;
  try {
    const result = await deleteParticularByParticularID(particular_id);
    res.send(result);
  } catch (error) {
    console.error("Error deleting particular:", error);
    res.status(500).send({ error: "Failed to delete particular" });
  }
});

// ENTRIES
app.get("/entries/:particular_id", async (req, res) => {
  const particular_id = req.params.particular_id;
  try {
    const entries = await getAllEntriesByParticularID(particular_id);
    res.send(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).send({ error: "Failed to fetch entries" });
  }
});
app.post("/entries", async (req, res) => {
  const { particular_id, amount, date, description, type } = req.body;
  try {
    const result = await createEntryByParticularID(
      particular_id,
      amount,
      date,
      description,
      type
    );
    res.status(201).send(result); // Status 201 for resource creation success
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).send({ error: "Failed to create entry" });
  }
});
app.put("/entries/:entry_id", async (req, res) => {
  const entry_id = req.params.entry_id;
  const { amount, date, description, type } = req.body;

  try {
    const result = await updateEntryByEntryID(
      entry_id,
      amount,
      date,
      description,
      type
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).send({ error: "Failed to update entry" });
  }
});
app.delete("/entries/:entry_id", async (req, res) => {
  const entry_id = req.params.entry_id;
  try {
    const result = await deleteEntryByEntryID(entry_id);
    res.send(result);
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).send({ error: "Failed to delete entry" });
  }
});

// EXTRA FUNCTIONS
// Calculate the sum in one specific ledger
app.get("/ledgerSum/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  try {
    const ledgerSum = await getSumAmountFromSpecificLedger(ledger_id);
    res.send(ledgerSum);
  } catch (error) {
    console.error("Error fetching the sum in one specific ledger:", error);
    res.status(500).send({ error: "Failed to fetch ledger sum." });
  }
});
// Calculate the sum in one specific particular
app.get("/particularSum/:particular_id", async (req, res) => {
  const particular_id = req.params.particular_id;
  try {
    const particularSum = await getSumAmountFromSpecificParticular(
      particular_id
    );
    res.send(particularSum);
  } catch (error) {
    console.error("Error fetching the sum in one specific particular:", error);
    res.status(500).send({ error: "Failed to fetch particular sum." });
  }
});
app.get("/createPDF/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  try {
    const PDF = await createPDFSpecificLedger(ledger_id);
    res.send(PDF);
  } catch (error) {
    console.error(
      "Error fetching data from different coloumns to create PDF/AccountBook :",
      error
    );
    res.status(500).send({
      error:
        "Failed to fetch data from different coloumns to create PDF/AccountBook.",
    });
  }
});
app.get("/accessKey/:user_id/:ledger_id", async (req, res) => {
  const ledger_id = req.params.ledger_id;
  const user_id = req.params.user_id;
  try {
    const accessKey = await getAccessKeyForLedger(user_id, ledger_id);
    res.send(accessKey);
  } catch (error) {
    console.error("Error fetching access key to view ledger :", error);
    res.status(500).send({
      error: "Failed to fetch access key to view ledger.",
    });
  }
});
app.post("/shareLedger", async (req, res) => {
  const { user_id, access_key } = req.body;
  // Check if both user_id and access_key are provided
  if (!user_id || !access_key) {
    return res
      .status(400)
      .json({ error: "user_id and access_key are required" });
  }
  try {
    // Call the function to create a copy of the ledger
    const result = await shareCopyOfLedgerWithAccessKey(user_id, access_key);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.status(201).json({ message: "Ledger copied successfully", result });
  } catch (error) {
    console.error("Error copying ledger:", error);
    res.status(500).json({ error: "Failed to copy ledger" });
  }
});

// mandatory part
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(cors()); // Use CORS middleware

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

// app.listen(PORT, HOST, () => {
//   console.log(`Server running at http://${HOST}:${PORT}`);
// });

// app.listen(8080, "0.0.0.0", () => {
//   console.log("Server is running on port 8080");
// });

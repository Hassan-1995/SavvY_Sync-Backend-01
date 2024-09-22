import mysql from "mysql2";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const secretKey = process.env.MY_SECRET_KEY;

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

//  USERS -- done this part
export async function getSingleUser(user_id) {
  try {
    const [result] = await pool.query(
      `
          SELECT * 
          FROM users
          WHERE user_id = ?
        `,
      [user_id]
    );
    if (result.length === 0) {
      //   throw new Error(`Client with user id ${user_id} not found`);
      console.log(`Client with user id ${user_id} not found`);
    } else {
      return result[0];
    }
  } catch (error) {
    console.error("Error geting user :", error);
    return { error: "Error getting user" };
    // throw error;
  }
}
export async function authenticateUser(mobile_phone_number) {
  try {
    const [result] = await pool.query(
      `
            SELECT * 
            FROM users
            WHERE mobile_phone_number = ?
          `,
      [mobile_phone_number]
    );

    // If no user is found, return a response indicating failure, but no error is thrown
    if (result.length === 0) {
      console.log(`User with Mobile Number ${mobile_phone_number} not found`);
      return { user: null, token: null, error: `User not found` };
    }

    const user = result[0];

    const token = jwt.sign(
      {
        user_id: user.user_id,
        user_name: user.user_name,
        mobile_phone_number: user.mobile_phone_number,
        created_at: user.created_at,
      },
      secretKey,
      {
        expiresIn: "1h", // Token expires in 1 hour
      }
    );
    console.log("User has been found:")
    return { user, token, error: null }; // Return the user and token if found
  } catch (error) {
    console.error("Error authenticating user:", error);
    // Handle the error without throwing it
    console.log("User has not been found:")
    return { user: null, token: null, error: error.message };
  }
}
export async function createNewUser(user_name, mobile_phone_number) {
  try {
    const [existingUser] = await pool.query(
      `
          SELECT mobile_phone_number 
          FROM users 
          WHERE mobile_phone_number = ?`,
      [mobile_phone_number]
    );

    if (existingUser.length > 0) {
      return { error: "User with this mobile number already exists." };
    } else {
      const [result] = await pool.query(
        `
            INSERT INTO users (user_name, mobile_phone_number, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW())
          `,
        [user_name, mobile_phone_number]
      );
      const newUser = await getSingleUser(result.insertId);
      return { user: newUser, message: "User created successfully." };
    }
  } catch (error) {
    console.error("Error creating new user: ", error);
    return { error: "Error creating new user" }; // Return an error response instead of throwing it
  }
}

//  LEDGERS
export async function getAllLedgers() {
  const [rows] = await pool.query("SELECT * FROM ledgers");
  return rows;
}
export async function getAllLedgersByUserID(user_id) {
  try {
    const [result] = await pool.query(
      `
        SELECT DISTINCT l.*
        FROM ledgers l
        WHERE l.user_id = ?

        UNION

        SELECT DISTINCT ls.*
        FROM ledger_sharing ls
        WHERE ls.user_id = ?
    `,
      [user_id, user_id]
    );
    if (result.length === 0) {
      //   throw new Error(`Ledger with user id ${user_id} not found`);
      console.log(`Ledger with user id ${user_id} not found`);
    } else {
      return result;
    }
  } catch (error) {
    console.error("Error geting ledger:", error);
    return { error: "Error getting ledger" };
    // throw error;
  }
}
export async function createLedgerByUserID(user_id, ledger_name) {
  try {
    // Generate a unique 10-character access_key
    const access_key = generateRandomString();

    // Insert the new ledger with access_key
    const [result] = await pool.query(
      `
        INSERT INTO ledgers (user_id, ledger_name, access_key, created_at, updated_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `,
      [user_id, ledger_name, access_key]
    );

    if (result.affectedRows === 0) {
      console.log(`Error creating new ledger for user id ${user_id}`);
      return { error: "Error creating new ledger" };
    } else {
      return {
        ledger_id: result.insertId,
        access_key, // Return the generated access_key
        message: "Ledger created successfully",
      };
    }
  } catch (error) {
    console.error("Error creating ledger:", error);
    return { error: "Error creating ledger" };
  }
}
export async function updateLedgerByLedgerID(ledger_id, ledger_name) {
  try {
    const [result] = await pool.query(
      `
        UPDATE ledgers 
        SET ledger_name = ?, updated_at = NOW()
        WHERE ledger_id = ?
        `,
      [ledger_name, ledger_id]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(`Ledger with id ${ledger_id} not found`);
      console.log(`Ledger with id ${ledger_id} not found`);
    } else {
      return {
        message: "Ledger updated successfully",
      };
    }
  } catch (error) {
    console.error("Error updating ledger:", error);
    // throw error;
    return { error: "Error updating ledger" };
  }
}
export async function deleteLedgerByLedgerID(user_id, ledger_id) {
  try {
    // First, delete from the ledgers table
    const [result1] = await pool.query(
      `DELETE FROM ledgers WHERE user_id = ? AND ledger_id = ?`,
      [user_id, ledger_id]
    );
    // Then, delete from the ledger_sharing table
    const [result2] = await pool.query(
      `DELETE FROM ledger_sharing WHERE user_id = ? AND ledger_id = ?`,
      [user_id, ledger_id]
    );
    if (result1.affectedRows === 0 && result2.affectedRows === 0) {
      console.log(`Ledger with id ${ledger_id} not found`);
      return { message: `Ledger with id ${ledger_id} not found` };
    } else {
      // Then check whether ledger_id available in ledger_sharing and ledgers table
      const [numberOfLedgers] = await pool.query(
        `SELECT *
        FROM ledgers l
        WHERE l.ledger_id = ?
        UNION
        SELECT *
        FROM ledger_sharing ls
        WHERE ls.ledger_id = ?`,
        [ledger_id, ledger_id]
      );
      if (numberOfLedgers.length === 0) {
        const [deleteUnwantedLedgers] = await pool.query(
          `DELETE FROM particulars WHERE ledger_id = ?`,
          [ledger_id]
        );
      } else {
        console.log("Hello: I am not empty: ", numberOfLedgers);
      }
      return {
        message: "Ledger deleted successfully",
      };
    }
  } catch (error) {
    console.error("Error deleting ledger:", error);
    return { error: "Error deleting ledger" };
  }
}

//  PARTICULARS
export async function getAllParticularsByLedgerID(ledger_id) {
  try {
    const [result] = await pool.query(
      `
          SELECT *
          FROM particulars
          WHERE ledger_id = ?
        `,
      [ledger_id]
    );
    // Return the result, even if it's an empty array, and handle it in the frontend
    return result;
  } catch (error) {
    console.error("Error getting particular:", error);
    // throw error; // Keep throwing the error if something went wrong with the query
    return { error: "Error getting particular" };
  }
}
export async function createParticularByLedgerID(ledger_id, particular_name) {
  try {
    const [result] = await pool.query(
      `
            INSERT INTO particulars (ledger_id, particular_name, created_at, updated_at) 
            VALUES (?, ?, NOW(), NOW())
        `,
      [ledger_id, particular_name]
    );
    if (result.affectedRows === 0) {
      console.log(`Error creating new particular for ledger id ${ledger_id}`);
      //   throw new Error(
      //     `Error creating new particular for ledger id ${ledger_id}`
      //   );
    } else {
      return {
        particular_id: result.insertId,
        message: "Particular created successfully",
      };
    }
  } catch (error) {
    console.error("Error creating particular:", error);
    // throw error;
    return { error: "Error creating particular." };
  }
}
export async function updateParticularByParticularID(
  particular_id,
  particular_name
) {
  try {
    const [result] = await pool.query(
      `
            UPDATE particulars 
            SET particular_name = ?, updated_at = NOW()
            WHERE particular_id = ?
          `,
      [particular_name, particular_id]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(`Particular with id ${particular_id} not found`);
      console.log(`Particular with id ${particular_id} not found`);
    } else {
      return {
        message: "Particular updated successfully",
      };
    }
  } catch (error) {
    console.error("Error updating particular:", error);
    // throw error;
    return { error: "Error updating particular" };
  }
}
export async function deleteParticularByParticularID(particular_id) {
  try {
    const [result] = await pool.query(
      `
        DELETE FROM particulars 
        WHERE particular_id = ?
      `,
      [particular_id]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(`Particular with id ${particular_id} not found`);
      console.log(`Particular with id ${particular_id} not found`);
    } else {
      return {
        message: "Particular deleted successfully",
      };
    }
  } catch (error) {
    console.error("Error deleting particular:", error);
    // throw error;
    return { error: "Error deleting particular." };
  }
}

//  ENTRIES
export async function getAllEntriesByParticularID(particular_id) {
  try {
    const [result] = await pool.query(
      `
        SELECT *
        FROM entries
        WHERE particular_id = ?  
      `,
      [particular_id]
    );
    return result;
  } catch (error) {
    console.error("Error geting entry:", error);
    // throw error;
    return { error: "Error getting entry." };
  }
}
export async function createEntryByParticularID(
  particular_id,
  amount,
  date,
  description,
  type
) {
  try {
    const [result] = await pool.query(
      `
            INSERT INTO entries (particular_id, amount, date, description, type, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
          `,
      [particular_id, amount, date, description, type]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(
      //     `Error creating new entry for particular id ${particular_id}`
      //   );
      console.log(
        `Error creating new entry for particular id ${particular_id}`
      );
    } else {
      return {
        entry_id: result.insertId,
        message: "Entry created successfully",
      };
    }
  } catch (error) {
    console.error("Error creating entry:", error);
    // throw error;
    return { error: "Error creating entry" };
  }
}
export async function updateEntryByEntryID(
  entry_id,
  amount,
  date,
  description,
  type
) {
  try {
    const [result] = await pool.query(
      `
            UPDATE entries 
            SET amount = ?, date = ?, description = ?, type = ?, updated_at = NOW()
            WHERE entry_id = ?
          `,
      [amount, date, description, type, entry_id]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(`Entry with id ${entry_id} not found`);
      console.log(`Entry with id ${entry_id} not found`);
    } else {
      return {
        message: "Entry updated successfully",
      };
    }
  } catch (error) {
    console.error("Error updating entry:", error);
    // throw error;
    return { error: "Error updating entry." };
  }
}
export async function deleteEntryByEntryID(entry_id) {
  try {
    const [result] = await pool.query(
      `
        DELETE FROM entries 
        WHERE entry_id = ?
        `,
      [entry_id]
    );
    if (result.affectedRows === 0) {
      //   throw new Error(`Entry with id ${entry_id} not found`);
      console.log(`Entry with id ${entry_id} not found`);
    } else {
      return {
        message: "Entry deleted successfully",
      };
    }
  } catch (error) {
    console.error("Error deleting entry:", error);
    // throw error;
    return { error: "Error deleting entry." };
  }
}

//  EXTRA FUNCTIONS
//  Calculate the sum in one specific ledger
export async function getSumAmountFromSpecificLedger(ledger_id) {
  try {
    const [result] = await pool.query(
      `
        SELECT *
        FROM entries
        WHERE particular_id IN (
                SELECT particular_id
                FROM particulars
                WHERE ledger_id = ?
            )  
        `,
      [ledger_id]
    );
    return result;
  } catch (error) {
    console.error("Error geting sum amount from specific ledger:", error);
    // throw error;
    return { error: "Error getting sum amount from specific ledger." };
  }
}
//  Calculate the sum in one specific particular
export async function getSumAmountFromSpecificParticular(particular_id) {
  try {
    const [result] = await pool.query(
      `
            SELECT *
            FROM entries
            WHERE particular_id = ?  
        `,
      [particular_id]
    );
    return result;
  } catch (error) {
    console.error("Error geting sum amount from specific particular: ", error);
    // throw error;
    return { error: "Error getting sum amount from specific particular." };
  }
}
//  Get data from different coloumns to create PDF/AccountBook file to share
export async function createPDFSpecificLedger(ledger_id) {
  try {
    const [result] = await pool.query(
      `
        SELECT particular_name, description, date, amount, type
        FROM entries 
        JOIN particulars ON entries.particular_id = particulars.particular_id
        WHERE particulars.ledger_id = ?
        ORDER BY date ASC;
        `,
      [ledger_id]
    );
    return result;
  } catch (error) {
    console.error(
      "Error geting data from different coloumns to create PDF/AccountBook :",
      error
    );
    // throw error;
    return {
      error:
        "Error geeting data from different columns to create PDF/AccountBook",
    };
  }
}
//  Get Access_key for particular ledger
export async function getAccessKeyForLedger(user_id, ledger_id) {
  try {
    const [result] = await pool.query(
      `
        SELECT *
        FROM access_key
        WHERE user_id = ? AND ledger_id = ?;
        `,
      [user_id, ledger_id]
    );
    return result;
  } catch (error) {
    console.error("Error geting access key for the ledger :", error);
    // throw error;
    return { error: "Error geting access key for the ledger" };
  }
}
//  Get ledger with access key
export async function shareCopyOfLedgerWithAccessKey(user_id, access_key) {
  try {
    const [result] = await pool.query(
      `
        INSERT INTO ledger_sharing (ledger_id, user_id, ledger_name, access_key, created_at, updated_at)
        SELECT ledger_id, ?, ledger_name, access_key, created_at, NOW()
        FROM ledgers
        WHERE access_key = ?;
        `,
      [user_id, access_key]
    );
    return result;
  } catch (error) {
    console.error("Error creating duplicate of ledger for user id ", error);
    // throw error;
    return { error: "Error creating duplicate of ledger for user id" };
  }
}
//  Function for random access_key generator
function generateRandomString(length = 10) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

//  Testing Commands
// const clients = await authenticateUser("0345-2057798");
// console.log("clients", clients);

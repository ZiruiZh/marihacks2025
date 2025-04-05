const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://mfdzmarihacks:HEuUF7vy2o8jwQxs@mhackscluster.4wozsqf.mongodb.net/?retryWrites=true&w=majority&appName=MHacksCluster";
const client = new MongoClient(uri);

async function insertPrompt(userPrompt, keywords = [], summary = "", sources = []) {
  try {
    await client.connect();
    const db = client.db('Users');
    const collection = db.collection('Prompts');
    
    // Create a document with the user's prompt, keywords, summary, sources, and timestamp
    const promptDocument = {
      prompt: userPrompt,
      keywords: keywords,
      summary: summary,
      sources: sources,
      timestamp: new Date(),
      // You can add additional fields here if needed
    };
    
    // Insert the document into the collection
    const result = await collection.insertOne(promptDocument);
    console.log(`Inserted document with _id: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error("Error inserting prompt:", error);
    throw error;
  } finally {
    // Close the database connection when finished or an error occurs
    await client.close();
  }
}

async function fetchPrompt(keywords) {
  try {
    await client.connect();
    const db = client.db('Users');
    const collection = db.collection('Prompts');
    
    // Find documents where at least one keyword matches
    const matchingDocuments = await collection.find({
      keywords: { $in: keywords }
    }).toArray();
    
    console.log(`Found ${matchingDocuments.length} matching documents`);
    return matchingDocuments;
  } catch (error) {
    console.error("Error fetching prompts:", error);
    throw error;
  } finally {
    // Close the database connection when finished or an error occurs
    await client.close();
  }
}

// Example usage - this would be called from your frontend
 insertPrompt(
   "What is the capital of France?", 
   ["capital", "France", "geography"],
   "Paris is the capital city of France.",
   ["https://example.com/source1", "https://example.com/source2", "https://example.com/source3", "https://example.com/source4", "https://example.com/source5"]
 ).catch(console.error);

// Example of fetching prompts with matching keywords
fetchPrompt(["France", "geography"]).then(documents => {
  console.log("Matching documents:", documents);
  
  // Print detailed information about each matching document
  if (documents.length > 0) {
    console.log(`\nFound ${documents.length} matching documents:`);
    documents.forEach((doc, index) => {
      console.log(`\n--- Document ${index + 1} ---`);
      console.log(`ID: ${doc._id}`);
      console.log(`Prompt: ${doc.prompt}`);
      console.log(`Keywords: ${doc.keywords.join(', ')}`);
      console.log(`Summary: ${doc.summary}`);
      console.log(`Sources: ${doc.sources.join(', ')}`);
      console.log(`Timestamp: ${doc.timestamp}`);
    });
  } else {
    console.log("No matching documents found.");
  }
}).catch(console.error);

// Export the functions to be used in other files
module.exports = { insertPrompt, fetchPrompt };



#!/usr/bin/env node

/**
 * Update All Zip Codes Script
 * 
 * This script processes all buy boxes and updates properties for each zip code.
 * It calls the update-properties-daily function once per zip code to avoid timeouts.
 * 
 * Usage:
 *   node scripts/update-all-zip-codes.js
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_KEY - Your Supabase service role key
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Configuration
const DELAY_BETWEEN_ZIP_CODES = 5000; // 5 seconds
const DELAY_BETWEEN_BUY_BOXES = 10000; // 10 seconds

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  console.error('Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=xxx node scripts/update-all-zip-codes.js');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBuyBoxes() {
  console.log('📦 Fetching all buy boxes...');
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/buy_boxes?select=id,name,zip_codes`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch buy boxes: ${response.status} ${response.statusText}`);
  }
  
  const buyBoxes = await response.json();
  console.log(`✅ Found ${buyBoxes.length} buy boxes\n`);
  
  return buyBoxes;
}

async function processZipCode(buyBoxId, buyBoxName, zipCode) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/update-properties-daily`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          buyBoxId: buyBoxId,
          zipCode: zipCode
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`      ❌ HTTP Error ${response.status}: ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error };
    }
    
    if (data.result?.success) {
      console.log(`      ✅ Success:`);
      console.log(`         New listings: ${data.result.newListings}`);
      console.log(`         Updated: ${data.result.updatedListings}`);
      console.log(`         Skipped: ${data.result.skippedCount}`);
      console.log(`         Total scraped: ${data.result.totalScraped}`);
      return { success: true, data: data.result };
    } else {
      console.log(`      ❌ Failed: ${data.result?.error || data.error || 'Unknown error'}`);
      return { success: false, error: data.result?.error || data.error };
    }
  } catch (error) {
    console.error(`      ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function updateAllZipCodes() {
  const startTime = Date.now();
  console.log('🚀 Starting property updates for all zip codes...\n');
  console.log(`   Delay between zip codes: ${DELAY_BETWEEN_ZIP_CODES}ms`);
  console.log(`   Delay between buy boxes: ${DELAY_BETWEEN_BUY_BOXES}ms\n`);
  
  try {
    // Fetch all buy boxes
    const buyBoxes = await fetchBuyBoxes();
    
    if (buyBoxes.length === 0) {
      console.log('⚠️  No buy boxes found. Nothing to process.');
      return;
    }
    
    // Statistics
    const stats = {
      totalBuyBoxes: buyBoxes.length,
      totalZipCodes: 0,
      processedZipCodes: 0,
      successfulZipCodes: 0,
      failedZipCodes: 0,
      skippedZipCodes: 0,
      totalNewListings: 0,
      totalUpdatedListings: 0
    };
    
    // Process each buy box
    for (let i = 0; i < buyBoxes.length; i++) {
      const buyBox = buyBoxes[i];
      
      console.log(`${'='.repeat(80)}`);
      console.log(`📦 Buy Box ${i + 1}/${buyBoxes.length}: ${buyBox.name}`);
      console.log(`   ID: ${buyBox.id}`);
      console.log(`${'='.repeat(80)}\n`);
      
      if (!buyBox.zip_codes || buyBox.zip_codes.length === 0) {
        console.log(`   ⚠️  No zip codes configured for this buy box, skipping\n`);
        continue;
      }
      
      console.log(`   📮 Zip codes: ${buyBox.zip_codes.join(', ')}`);
      console.log(`   Total: ${buyBox.zip_codes.length}\n`);
      
      stats.totalZipCodes += buyBox.zip_codes.length;
      
      // Process each zip code
      for (let j = 0; j < buyBox.zip_codes.length; j++) {
        const zipCode = buyBox.zip_codes[j];
        
        console.log(`   📮 [${j + 1}/${buyBox.zip_codes.length}] Processing zip code: ${zipCode}`);
        
        stats.processedZipCodes++;
        
        const result = await processZipCode(buyBox.id, buyBox.name, zipCode);
        
        if (result.success) {
          stats.successfulZipCodes++;
          stats.totalNewListings += result.data?.newListings || 0;
          stats.totalUpdatedListings += result.data?.updatedListings || 0;
        } else {
          stats.failedZipCodes++;
        }
        
        // Add delay between zip codes (except after the last one)
        if (j < buyBox.zip_codes.length - 1) {
          console.log(`      ⏳ Waiting ${DELAY_BETWEEN_ZIP_CODES}ms before next zip code...\n`);
          await sleep(DELAY_BETWEEN_ZIP_CODES);
        }
      }
      
      console.log(`\n   ✅ Completed buy box: ${buyBox.name}`);
      console.log(`   Processed: ${buyBox.zip_codes.length} zip codes\n`);
      
      // Add delay between buy boxes (except after the last one)
      if (i < buyBoxes.length - 1) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BUY_BOXES}ms before next buy box...\n`);
        await sleep(DELAY_BETWEEN_BUY_BOXES);
      }
    }
    
    // Final statistics
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FINAL STATISTICS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Buy Boxes Processed:      ${stats.totalBuyBoxes}`);
    console.log(`Total Zip Codes:          ${stats.totalZipCodes}`);
    console.log(`Successful Zip Codes:     ${stats.successfulZipCodes}`);
    console.log(`Failed Zip Codes:         ${stats.failedZipCodes}`);
    console.log(`Total New Listings:       ${stats.totalNewListings}`);
    console.log(`Total Updated Listings:   ${stats.totalUpdatedListings}`);
    console.log(`Duration:                 ${minutes}m ${seconds}s`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (stats.failedZipCodes > 0) {
      console.log(`⚠️  ${stats.failedZipCodes} zip code(s) failed. Check logs above for details.`);
      process.exit(1);
    } else {
      console.log(`✅ All zip codes processed successfully!`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
updateAllZipCodes();


import { pool } from './db';

async function checkRequestDetails() {
  try {
    console.log('🔍 Checking full details for REQ-1762389641184-659 and REQ-1762389371984-902...\n');

    // Get all fields from requests table
    const { rows: requests } = await pool.query(`
      SELECT *
      FROM requests
      WHERE request_number IN ('REQ-1762389641184-659', 'REQ-1762389371984-902')
      ORDER BY created_at DESC
    `);

    requests.forEach(req => {
      console.log(`\n📦 Request: ${req.request_number}`);
      console.log(`   ID: ${req.id}`);
      console.log(`   Company ID: ${req.company_id}`);
      console.log(`   Driver ID: ${req.driver_id || 'N/A'}`);
      console.log(`   Zone Type ID: ${req.zone_type_id}`);
      console.log(`   Service Location ID: ${req.service_location_id || 'N/A'}`);
      console.log(`   Is Later: ${req.is_later}`);
      console.log(`   Created At: ${req.created_at}`);
      console.log(`   Completed: ${req.is_completed}`);
      console.log(`   Cancelled: ${req.is_cancelled}`);
    });

    // Check request_places (should be empty based on previous check)
    console.log('\n\n🗺️  Checking request_places table:');
    const { rows: places } = await pool.query(`
      SELECT *
      FROM request_places
      WHERE request_id IN (
        SELECT id FROM requests
        WHERE request_number IN ('REQ-1762389641184-659', 'REQ-1762389371984-902')
      )
    `);

    if (places.length === 0) {
      console.log('❌ NO PLACE DATA FOUND - This is the problem!');
      console.log('   The requests were created but address data was not saved.');
    } else {
      places.forEach(place => {
        console.log(`\n   Place for request ID: ${place.request_id}`);
        console.log(`   Pickup: ${place.pick_address}`);
        console.log(`   Delivery: ${place.drop_address}`);
      });
    }

    // Check request_bills
    console.log('\n\n💰 Checking request_bills table:');
    const { rows: bills } = await pool.query(`
      SELECT *
      FROM request_bills
      WHERE request_id IN (
        SELECT id FROM requests
        WHERE request_number IN ('REQ-1762389641184-659', 'REQ-1762389371984-902')
      )
    `);

    if (bills.length === 0) {
      console.log('❌ No billing data found');
    } else {
      bills.forEach(bill => {
        console.log(`\n   Bill for request ID: ${bill.request_id}`);
        console.log(`   Total Amount: ${bill.total_amount || 'N/A'}`);
        console.log(`   Base Price: ${bill.base_price || 'N/A'}`);
      });
    }

    // Check most recent request_places to see format
    console.log('\n\n📋 Checking most recent request_places (for comparison):');
    const { rows: recentPlaces } = await pool.query(`
      SELECT rp.*, r.request_number
      FROM request_places rp
      JOIN requests r ON rp.request_id = r.id
      ORDER BY rp.created_at DESC
      LIMIT 5
    `);

    if (recentPlaces.length > 0) {
      recentPlaces.forEach(place => {
        console.log(`\n   Request: ${place.request_number}`);
        console.log(`   Pickup: ${place.pick_address?.substring(0, 50)}...`);
        console.log(`   Delivery: ${place.drop_address?.substring(0, 50)}...`);
        console.log(`   Has coordinates: ${place.pick_lat ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No request_places found in database at all!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkRequestDetails();

import { pool } from './db';

async function checkDeliveries() {
  try {
    console.log('🔍 Searching for deliveries REQ-1762389641184-659 and REQ-1762389371984-902...\n');

    // Search for the specific request numbers
    const { rows: specificRequests } = await pool.query(`
      SELECT id, request_number, company_id, created_at,
             is_completed, is_cancelled, is_driver_started
      FROM requests
      WHERE request_number IN ('REQ-1762389641184-659', 'REQ-1762389371984-902')
      ORDER BY created_at DESC
    `);

    if (specificRequests.length > 0) {
      console.log('✅ Found the following requests:');
      specificRequests.forEach(req => {
        const status = req.is_completed ? 'Completed' : req.is_cancelled ? 'Cancelled' : req.is_driver_started ? 'In Progress' : 'Pending';
        console.log(`  - ${req.request_number} (ID: ${req.id}, Company: ${req.company_id}, Status: ${status}, Created: ${req.created_at})`);
      });
    } else {
      console.log('❌ No requests found with those request_numbers\n');

      // Let's check the most recent requests to understand the pattern
      console.log('📋 Most recent requests in the database:');
      const { rows: recentRequests } = await pool.query(`
        SELECT id, request_number, company_id, created_at,
               is_completed, is_cancelled, is_driver_started
        FROM requests
        ORDER BY created_at DESC
        LIMIT 10
      `);

      recentRequests.forEach(req => {
        const status = req.is_completed ? 'Completed' : req.is_cancelled ? 'Cancelled' : req.is_driver_started ? 'In Progress' : 'Pending';
        console.log(`  - ${req.request_number} (ID: ${req.id}, Company: ${req.company_id}, Status: ${status}, Created: ${req.created_at})`);
      });

      // Check if there are any requests created around the same time
      console.log('\n🕐 Checking for requests created around the same time (Nov 5, 2025 18:30-18:45):');
      const { rows: timeRangeRequests } = await pool.query(`
        SELECT id, request_number, company_id, created_at,
               is_completed, is_cancelled, is_driver_started
        FROM requests
        WHERE created_at >= '2025-11-05 18:30:00'
          AND created_at <= '2025-11-05 18:45:00'
        ORDER BY created_at DESC
      `);

      if (timeRangeRequests.length > 0) {
        timeRangeRequests.forEach(req => {
          const status = req.is_completed ? 'Completed' : req.is_cancelled ? 'Cancelled' : req.is_driver_started ? 'In Progress' : 'Pending';
          console.log(`  - ${req.request_number} (ID: ${req.id}, Company: ${req.company_id}, Status: ${status}, Created: ${req.created_at})`);
        });
      } else {
        console.log('  No requests found in that time range');
      }
    }

    // Check the request_places table for these deliveries
    console.log('\n🗺️  Checking request_places table:');
    const { rows: places } = await pool.query(`
      SELECT rp.*, r.request_number
      FROM request_places rp
      JOIN requests r ON rp.request_id = r.id
      WHERE r.request_number IN ('REQ-1762389641184-659', 'REQ-1762389371984-902')
    `);

    if (places.length > 0) {
      console.log('✅ Found address data:');
      places.forEach(place => {
        console.log(`  - ${place.request_number}:`);
        console.log(`    Pickup: ${place.pick_address}`);
        console.log(`    Delivery: ${place.drop_address}`);
      });
    } else {
      console.log('❌ No address data found for these requests');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDeliveries();

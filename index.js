// Load the Okanjo SDK
const OkanjoAPI = require('okanjo');

// Load Moment.js, a super handy dandy library for date math
const Moment = require('moment');

// We're going to use the file system to write out the raw JSON
const FS = require('fs').promises;

// You'll need your Okanjo account credentials in order to execute requests on your behalf
// If you run this script from the command line, you could pass in variables like
// EMAIL=user@domain.tld PASSWORD=pass API_KEY=secrets node my-script.js
const email = process.env.EMAIL;        // set this to your okanjo account email address
const password = process.env.PASSWORD;  // set this to your okanjo account password
const key = process.env.API_KEY;        // set this to your okanjo API key

// Instantiate the Okanjo API client, using your API key
const api = new OkanjoAPI({
    key // use key defined above
});

// Wrap the core logic in an async function so we can await asynchronous operations
async function main() {

    // Most API routes require authentication, so you'll need to first login with an account
    // https://developer.okanjo.com/api#account-sessions-create-a-session
    const { data: sessionContext } = await api.sessions.create({
        email,  // use email/password defined above
        password,
    }).execute(); // also returned is statusCode and error

    // Extract your account and session objects from the session response
    const { account, session } = sessionContext;

    // account is your complete account record, who you are executing requests on behalf of
    // session is your current session object created as a result of the login. 
    // - It contains the token you need for subsequent requests.
    // - Sessions currently expire two weeks. Feel free to cache tokens during that time!

    // Now let's pull the individual commission / transaction report
    // https://developer.okanjo.com/farm#reporting-commission-report
    const { data: commissions } = await api.farm.reporting.commission_report({
        // Required parameters
        start: Moment.utc().startOf('day').subtract(30, 'days').toISOString(),    // 30 days ago
        end:   Moment.utc().startOf('day').toISOString(),                         // Not including today

        // Optional parameters (see docs url above for a slew of filtering options)
        // e.g.
        // instance_ids: [ 'YOUR_FARM_INSTANCE_ID_HERE' ]

    }).setSessionToken(session.token).execute();

    // commissions is now an array of all commissions with HEAPS of data on the records

    // Write the raw payload to a readable JSON file
    await FS.writeFile('output.json', JSON.stringify(commissions, null, 2), 'utf8');

    // Now for example, let's turn it into crude, oversimplfied CSV
    
    // Header row:
    let csv = "commission_id,transaction_date,transaction_total,transaction_commission,vendor_id_offer_id, offer_title,vendor_type,click_source,referrer,placement_id,city,country\n";
    
    // Convert records to a CSV line
    const mappedRecords = commissions.map(commission => {
        return '"' + [
            commission.id,                      // Okanjo commission id      
            commission.transaction_date,        // When the network reported the commission
            commission.transaction_total,       // The total sale amount, if applicable
            commission.transaction_commission,  // The total commission earned
            commission.vendor_id_offer_id,      // Constitutes our unique offer id
            commission.offer_title.replace(/"/g, '""'), // The offer of the title, at the time it was reported
            commission.vendor_type,             // Network the commission came from
            commission.click_source,            // Either smartserve or shortcodes (e.g. evergreen link)
            commission.referrer,                // The page url or origin url depending on smartserve and browser referrer policy, if available
            commission.placement_id,            // The placement id, if click_source was smartserve
            `${commission.geo.city || '?'}, ${commission.geo.sub_1_code || commission.geo.sub_1 || commission.geo.sub_2_code || '?'}`, // City, ST
            commission.geo.country || '?'       // Country
        ].join('","') + '"';
    });
    
    // Output all csv lines separated by a new line
    csv += mappedRecords.join('\n');
    await FS.writeFile('output.csv', csv, 'utf8');

    // Since this script isn't going to cache the session, end it so it's not floating out in the wild for two weeks
    await api.sessions.delete(account.id, session.id).setSessionToken(session.token).execute();
    
    // Want to pass anything out of this async function? 
    return {
        commissions
    };
}

// Execute the main script!
// noinspection JSUnusedLocalSymbols
main()
    .then(res => {
        // res contains { commissions } if you wanted to do something with the output
        console.log('DONE!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Something went wrong!', err);
        process.exit(1);
    })
;

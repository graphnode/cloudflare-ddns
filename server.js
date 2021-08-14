import Cloudflare from 'cloudflare';
import PublicIP from 'public-ip';
import Schedule from 'node-schedule';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

let cache = {
    zoneId: null,
    recordId: null
}

const cf = new Cloudflare({ email: process.env.EMAIL, key: process.env.KEY });

const log = {
    info: (...msg) => console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${msg.join(' ')}`),
    error: (...msg) => console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${msg.join(' ')}`),
};

const syncDDNS = async function() {
    try {
        const currentIP = await PublicIP.v4();

        if (!currentIP) {
            log.error('Unable to get current IP.');
            return;
        }

        log.info(`Got current IP: ${currentIP}. Checking Cloudflare zone...`);

        if (!cache.zoneId) {
            log.info(`Zone id for "${process.env.ZONE}" not in cache. Getting it from Zones API...`);
            const zones = (await cf.zones.browse()).result;
            const zone = zones.find((zone) => zone.name === process.env.ZONE);

            if (!zone) {
                throw `Unable to find zone id for "${process.env.ZONE}".`;
            }
            
            cache.zoneId = zone.id;
        }

        if (!cache.recordId) {
            log.info(`Record id for "${process.env.RECORD}" not in cache. Getting it from Records API...`);
            const records = (await cf.dnsRecords.browse(cache.zoneId)).result;
            const record = records.find((r) => r.name === process.env.RECORD);

            if (!record) {
                throw `Unable to find record id for "${process.env.RECORD}".`;
            }

            cache.recordId = record.id;
        }
        
        const record = (await cf.dnsRecords.read(cache.zoneId, cache.recordId)).result;

        const oldIP = record.content;

        if (oldIP !== currentIP) {
            log.info(`Current IP (${currentIP}) different from the one stored on cloudflare (${oldIP}). Updating entry with new IP...`);

            record.content = currentIP;

            await cf.dnsRecords.edit(cache.zoneId, cache.recordId, record);
        }

        log.info(`Scheduled synchronization with cloudflare is done.`);

    } catch(e) {
        log.error(`There was an error while synchronizing: ${e}`);
        throw e;
    }
};

log.info('Forcing synchronization for the first time...');
await syncDDNS();

log.info('Setting up scheduler...');
Schedule.scheduleJob('0 */4 * * *', syncDDNS);

log.info('DDNS is running.');

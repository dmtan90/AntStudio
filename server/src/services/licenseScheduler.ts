import { AdminSettings } from '../models/AdminSettings.js';
import axios from 'axios';
import config from '../utils/config.js';

const LICENSE_SERVER_URL = 'https://camos.agrhub.com/CamOS/rest/v2/license-status';
import os from 'os';

// Get MAC address (simplified) or UUID
function getInstanceId() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                return iface.mac; // Using MAC as Instance ID as per request requirement "generate UUID from mac address"
            }
        }
    }
    return '00:00:00:00:00:00';
}

function getIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

export const licenseService = {
    async checkLicense() {
        try {
            const settings = await AdminSettings.findOne();
            if (!settings || !settings.license || !settings.license.key) {
                return;
            }

            const payload = {
                instanceId: getInstanceId(),
                key: settings.license.key,
                ip: getIpAddress(),
                instanceType: 'antflow',
                instanceVersion: '1.0.0' // Should come from package.json or config
            };

            const response = await axios.post(LICENSE_SERVER_URL, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            const data = response.data;
            console.log("license data", data);
            if (data && data.status) {
                settings.license.info = {
                    status: data.status,
                    type: data.type || 'trial',
                    maxUsers: (data.type === 'enterprise' || data.type === 'pro') ? -1 : 5,//-1 is unlimited
                    maxProjects: (data.type === 'enterprise' || data.type === 'pro') ? -1 : 10,//-1 is unlimited
                    startDate: new Date(parseInt(data.startDate)),
                    endDate: new Date(parseInt(data.endDate)),
                    owner: data.owner,
                    lastCheckedAt: new Date()
                };
                await settings.save();
                console.log('License check successful:', data.status);
            }
        } catch (error: any) {
            console.error('License check failed:', error.message);
            // Optional: If check fails multiple times, mark as invalid? 
            // For now, keep existing status but log error.
        }
    },

    startScheduler() {
        // Run immediately on startup
        this.checkLicense();

        // Run every 10 minutes
        setInterval(() => {
            this.checkLicense();
        }, 10 * 60 * 1000);
    }
};

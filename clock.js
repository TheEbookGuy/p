// Digital Clock with Multiple Timezone Support

class GlobalClock {
    constructor() {
        this.defaultTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'Asia/Dubai'];
        this.timezones = [...this.defaultTimezones];
        this.timeFormat = '12'; // '12' or '24' hour format
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.setupTimezoneSelect();
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.render();
        this.startUpdating();
    }

    setupTimezoneSelect() {
        const select = document.getElementById('timezoneSelect');
        const allTimezones = this.getAllTimezones();
        
        allTimezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz;
            option.textContent = tz;
            select.appendChild(option);
        });
    }

    getAllTimezones() {
        return [
            'UTC',
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Anchorage',
            'Pacific/Honolulu',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Moscow',
            'Asia/Dubai',
            'Asia/Kolkata',
            'Asia/Bangkok',
            'Asia/Singapore',
            'Asia/Hong_Kong',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Pacific/Auckland',
            'Pacific/Fiji',
            'Atlantic/Azores',
            'Africa/Cairo',
            'Africa/Johannesburg',
            'America/Toronto',
            'America/Mexico_City',
            'America/Sao_Paulo',
            'America/Buenos_Aires',
            'Asia/Jakarta',
            'Asia/Manila',
            'Asia/Shanghai',
            'America/Vancouver',
            'Australia/Perth'
        ];
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addTimezone());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetToDefault());
        document.getElementById('format24Btn').addEventListener('click', () => this.setTimeFormat('24'));
        document.getElementById('format12Btn').addEventListener('click', () => this.setTimeFormat('12'));
        document.getElementById('timezoneSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.addTimezone(e.target.value);
                e.target.value = '';
            }
        });
    }

    addTimezone(timezone) {
        const select = document.getElementById('timezoneSelect');
        const tzToAdd = timezone || select.value;
        
        if (tzToAdd && !this.timezones.includes(tzToAdd)) {
            this.timezones.push(tzToAdd);
            this.saveToLocalStorage();
            this.render();
            select.value = '';
        }
    }

    removeTimezone(timezone) {
        this.timezones = this.timezones.filter(tz => tz !== timezone);
        this.saveToLocalStorage();
        this.render();
    }

    resetToDefault() {
        this.timezones = [...this.defaultTimezones];
        this.timeFormat = '12';
        this.saveToLocalStorage();
        this.setTimeFormat('12');
        this.render();
    }

    setTimeFormat(format) {
        this.timeFormat = format;
        document.getElementById('format24Btn').classList.toggle('active', format === '24');
        document.getElementById('format12Btn').classList.toggle('active', format === '12');
        this.saveToLocalStorage();
        this.render();
    }

    formatTime(date, timezone) {
        const options = {
            hour: this.timeFormat === '24' ? '2-digit' : 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: this.timeFormat === '12',
            timeZone: timezone
        };
        return date.toLocaleTimeString('en-US', options);
    }

    formatDate(date, timezone) {
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: timezone
        };
        return date.toLocaleDateString('en-US', options);
    }

    getTimePeriod(date, timezone) {
        const time = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        const hour = time.getHours();
        
        if (hour >= 5 && hour < 12) return '🌅 Morning';
        if (hour >= 12 && hour < 17) return '☀️ Afternoon';
        if (hour >= 17 && hour < 21) return '🌆 Evening';
        return '🌙 Night';
    }

    render() {
        const grid = document.getElementById('clocksGrid');
        const now = new Date();
        grid.innerHTML = '';

        this.timezones.forEach(timezone => {
            const card = document.createElement('div');
            card.className = 'clock-card';
            card.innerHTML = `
                <button class="remove-btn" onclick="clock.removeTimezone('${timezone}')">×</button>
                <div class="timezone-name">${timezone}</div>
                <div class="digital-time">${this.formatTime(now, timezone)}</div>
                <div class="date-info">${this.formatDate(now, timezone)}</div>
                <div class="time-period">${this.getTimePeriod(now, timezone)}</div>
            `;
            grid.appendChild(card);
        });

        this.updateLastUpdated();
    }

    updateLastUpdated() {
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        
        if (seconds === 0) {
            document.getElementById('lastUpdated').textContent = 'Just now';
        } else if (seconds < 30) {
            document.getElementById('lastUpdated').textContent = `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        } else {
            document.getElementById('lastUpdated').textContent = `${60 - seconds} second${60 - seconds !== 1 ? 's' : ''} ago`;
        }
    }

    startUpdating() {
        // Update every second
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => this.render(), 1000);
    }

    saveToLocalStorage() {
        const data = {
            timezones: this.timezones,
            timeFormat: this.timeFormat
        };
        localStorage.setItem('clockData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('clockData');
        if (data) {
            const parsed = JSON.parse(data);
            this.timezones = parsed.timezones || this.defaultTimezones;
            this.timeFormat = parsed.timeFormat || '12';
            this.setTimeFormat(this.timeFormat);
        }
    }
}

// Initialize the clock when DOM is ready
let clock;
document.addEventListener('DOMContentLoaded', () => {
    clock = new GlobalClock();
});

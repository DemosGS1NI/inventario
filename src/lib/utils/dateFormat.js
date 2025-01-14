// src/lib/utils/dateFormat.js
export function formatDateTime(dateString) {
    if (!dateString) return '';
    
    try {
        // Split the date string into components
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, secondWithTZ] = timePart.split(':');
        const second = secondWithTZ.substring(0, 2); // Remove timezone part
        
        // Parse the hours directly from the string
        const originalHours = parseInt(hour, 10);
        
        // Convert to 12-hour format and determine AM/PM
        const ampm = originalHours >= 12 ? 'PM' : 'AM';
        let hours = originalHours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12 for midnight
        hours = hours.toString().padStart(2, '0');
        
        // Array of month abbreviations in Spanish
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        
        // Use the original date components
        const formattedMonth = months[parseInt(month, 10) - 1];
        const formattedDay = day.padStart(2, '0');
        const formattedYear = year.slice(-2);
        
        return `${formattedDay}-${formattedMonth}-${formattedYear} ${hours}:${minute}:${second} ${ampm}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}
export function formatDateTime(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        const localDate = new Date(date.toLocaleString());  // Convert to local time
        
        const year = localDate.getFullYear().toString();
        const month = localDate.getMonth();
        const day = localDate.getDate().toString().padStart(2, '0');
        let hours = localDate.getHours();
        const minute = localDate.getMinutes().toString().padStart(2, '0');
        const second = localDate.getSeconds().toString().padStart(2, '0');
        
       
        hours = hours % 12 || 12;
        hours = hours.toString().padStart(2, '0');
        
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        
        return `${day}-${months[month]}-${year.slice(-2)} ${hours}:${minute}:${second}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}
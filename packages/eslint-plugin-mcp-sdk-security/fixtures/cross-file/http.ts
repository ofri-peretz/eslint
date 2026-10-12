/**
 * Cross-file fixture: an HTTP client instance built in its own module.
 */
import axios from 'axios';

export const api = axios.create({ timeout: 5000 });

#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './ui/app.js';

const initialQuery = process.argv.slice(2).join(' ').trim();

render(<App initialQuery={initialQuery} />);

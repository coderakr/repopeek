import React, {useEffect, useMemo, useState} from 'react';
import {Box, Newline, Text, useApp, useInput, useStdin, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import {fetchRepoInfo, parseRepoInput, type RepoInfo} from '../lib/github.js';

type AppProps = {
  initialQuery?: string;
};

type FetchState =
  | {status: 'idle'}
  | {status: 'loading'; query: string}
  | {status: 'success'; query: string; data: RepoInfo}
  | {status: 'error'; query: string; message: string};

const palette = {
  bg: '#0f172a',
  accent: '#f97316',
  accentSoft: '#fdba74',
  cyan: '#67e8f9',
  green: '#86efac',
  muted: '#94a3b8',
  red: '#fca5a5',
  white: '#e2e8f0',
  yellow: '#fde68a'
};

const statOrder: Array<{label: string; key: keyof Pick<RepoInfo, 'stars' | 'forks' | 'watchers' | 'openIssues'>}> = [
  {label: 'Stars', key: 'stars'},
  {label: 'Forks', key: 'forks'},
  {label: 'Watchers', key: 'watchers'},
  {label: 'Issues', key: 'openIssues'}
];

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));

const compact = (value: number) =>
  new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1}).format(value);

const fit = (value: string, maxWidth: number) => {
  if (maxWidth <= 0) {
    return '';
  }

  if (value.length <= maxWidth) {
    return value;
  }

  if (maxWidth <= 1) {
    return value.slice(0, maxWidth);
  }

  return `${value.slice(0, maxWidth - 1)}…`;
};

const App = ({initialQuery = ''}: AppProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<FetchState>({status: 'idle'});
  const {exit} = useApp();
  const {isRawModeSupported} = useStdin();
  const {stdout} = useStdout();
  const [terminalWidth, setTerminalWidth] = useState(stdout.columns ?? 80);
  const interactive = isRawModeSupported;
  const canEditInput = interactive && state.status === 'idle';

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setState({status: 'error', query: value, message: 'Paste a GitHub repo URL or owner/repo.'});
      return;
    }

    const parsed = parseRepoInput(trimmed);
    if (!parsed) {
      setState({status: 'error', query: trimmed, message: 'Use a GitHub URL or owner/repo.'});
      return;
    }

    const normalizedQuery = `${parsed.owner}/${parsed.repo}`;
    setState({status: 'loading', query: normalizedQuery});

    try {
      const data = await fetchRepoInfo(normalizedQuery);
      setState({status: 'success', query: normalizedQuery, data});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      setState({status: 'error', query: normalizedQuery, message});
    }
  };

  useEffect(() => {
    if (initialQuery) {
      void submit(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const syncWidth = () => setTerminalWidth(stdout.columns ?? 80);

    syncWidth();
    stdout.on('resize', syncWidth);

    return () => {
      stdout.off('resize', syncWidth);
    };
  }, [stdout]);

  useEffect(() => {
    if (!interactive && initialQuery && (state.status === 'success' || state.status === 'error')) {
      exit();
    }
  }, [exit, initialQuery, interactive, state]);

  const helperText = useMemo(() => {
    const parsed = parseRepoInput(query);
    if (!query.trim()) {
      return 'Examples: vercel/next.js or https://github.com/facebook/react';
    }

    return parsed
      ? `Ready to fetch ${parsed.owner}/${parsed.repo}`
      : 'Input must be a GitHub URL or owner/repo';
  }, [query]);

  const cardWidth = Math.max(Math.min(terminalWidth - 4, 88), 40);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {interactive ? (
        <InteractiveShortcuts
          exit={exit}
          state={state}
          reset={() => {
            setQuery('');
            setState({status: 'idle'});
          }}
        />
      ) : null}
      <Hero width={cardWidth} />
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor={palette.accent} paddingX={1} paddingY={1} width={cardWidth}>
        <Text color={palette.white}>
          Paste a GitHub repo link or <Text color={palette.cyan}>owner/repo</Text>
        </Text>
        <Box marginTop={1}>
          <Text color={palette.accent}>› </Text>
          {canEditInput ? (
            <TextInput
              value={query}
              onChange={setQuery}
              onSubmit={submit}
              placeholder="https://github.com/owner/repo"
            />
          ) : (
            <Text color={palette.white}>{query || 'Run with an argument like owner/repo'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color={parseRepoInput(query) || !query.trim() ? palette.muted : palette.red}>
            {fit(helperText, cardWidth - 4)}
          </Text>
        </Box>
      </Box>

      <StatusPanel state={state} width={cardWidth} />

      <Box marginTop={1}>
        <Text color={palette.muted}>
          {interactive
            ? state.status === 'idle'
              ? 'Enter to fetch, Esc to exit'
              : 'R to reset, Esc to exit'
            : 'Tip: run repopeek owner/repo or start it in a TTY for live input'}
        </Text>
      </Box>
    </Box>
  );
};

const InteractiveShortcuts = ({
  exit,
  state,
  reset
}: {
  exit: () => void;
  state: FetchState;
  reset: () => void;
}) => {
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
    }

    if (state.status !== 'idle' && input.toLowerCase() === 'r') {
      reset();
    }
  });

  return null;
};

const Hero = ({width}: {width: number}) => {
  const line = '═'.repeat(Math.max(width - 2, 10));

  return (
    <Box flexDirection="column" width={width}>
      <Text color={palette.accentSoft}>{fit(line, width)}</Text>
      <Text color={palette.white}>
        <Text color={palette.accent}>REPO</Text> <Text color={palette.cyan}>PEEK</Text>{' '}
        <Text color={palette.muted}>repo intelligence for your terminal</Text>
      </Text>
      <Text color={palette.muted}>
        Fast GitHub metadata lookup with repo size in MB.
      </Text>
    </Box>
  );
};

const StatusPanel = ({state, width}: {state: FetchState; width: number}) => {
  if (state.status === 'idle') {
    return null;
  }

  if (state.status === 'loading') {
    return (
      <Box marginTop={1} borderStyle="round" borderColor={palette.cyan} paddingX={1} paddingY={1} width={width}>
        <Text color={palette.cyan}>Fetching {state.query} from GitHub…</Text>
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor={palette.red} paddingX={1} paddingY={1} width={width}>
        <Text color={palette.red}>Request failed</Text>
        <Text color={palette.white}>{fit(state.message, width - 4)}</Text>
      </Box>
    );
  }

  return <RepoCard data={state.data} width={width} />;
};

const RepoCard = ({data, width}: {data: RepoInfo; width: number}) => {
  const statBlocks = statOrder
    .map(({label, key}) => `${label} ${compact(data[key])}`)
    .join('   ');

  const meta = [
    `${data.visibility}`,
    data.archived ? 'archived' : null,
    data.fork ? 'fork' : null,
    data.language ?? 'no primary language'
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Box marginTop={1} flexDirection="column" borderStyle="double" borderColor={palette.green} paddingX={1} paddingY={1} width={width}>
      <Text color={palette.green}>{fit(data.fullName, width - 4)}</Text>
      <Text color={palette.muted}>{fit(meta, width - 4)}</Text>
      {data.description ? (
        <Box marginTop={1}>
          <Text color={palette.white}>{fit(data.description, width - 4)}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color={palette.yellow}>{fit(statBlocks, width - 4)}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <InfoRow label="Size" value={`${data.sizeMb} MB (${compact(data.sizeKb)} KB)`} width={width} />
        <InfoRow label="Branch" value={data.defaultBranch} width={width} />
        <InfoRow label="License" value={data.license ?? 'None'} width={width} />
        <InfoRow label="Created" value={shortDate(data.createdAt)} width={width} />
        <InfoRow label="Updated" value={shortDate(data.updatedAt)} width={width} />
        <InfoRow label="Pushed" value={shortDate(data.pushedAt)} width={width} />
      </Box>
      {data.topics.length > 0 ? (
        <Box marginTop={1}>
          <Text color={palette.cyan}>{fit(`Topics: ${data.topics.join(', ')}`, width - 4)}</Text>
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        <Text color={palette.accentSoft}>{fit(data.url, width - 4)}</Text>
        {data.homepage ? (
          <Text color={palette.muted}>{fit(data.homepage, width - 4)}</Text>
        ) : null}
      </Box>
      <Newline />
      <Text color={palette.muted}>Press R to inspect another repo</Text>
    </Box>
  );
};

const InfoRow = ({label, value, width}: {label: string; value: string; width: number}) => (
  <Box>
    <Box width={9}>
      <Text color={palette.muted}>{label}</Text>
    </Box>
    <Text color={palette.white}>{fit(value, width - 14)}</Text>
  </Box>
);

export {App};

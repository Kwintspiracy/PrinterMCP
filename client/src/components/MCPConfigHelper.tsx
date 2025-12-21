import { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    useColorModeValue,
    useToast,
    Icon,
    Code,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Tooltip,
} from '@chakra-ui/react';
import { FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';

interface MCPConfigHelperProps {
    deploymentUrl?: string;
}

export default function MCPConfigHelper({ deploymentUrl }: MCPConfigHelperProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const [detectedUrl, setDetectedUrl] = useState('');
    const toast = useToast();

    const borderColor = useColorModeValue('borderLight.default', 'border.default');
    const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
    const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
    const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
    const codeBg = useColorModeValue('gray.100', 'gray.800');

    useEffect(() => {
        // Auto-detect current URL
        if (deploymentUrl) {
            setDetectedUrl(deploymentUrl);
        } else if (typeof window !== 'undefined') {
            setDetectedUrl(window.location.origin);
        }
    }, [deploymentUrl]);

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            toast({ title: `${label} copied!`, status: 'success', duration: 2000 });
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            toast({ title: 'Failed to copy', status: 'error', duration: 2000 });
        }
    };

    // MCP Config for stdio (local)
    const stdioConfig = JSON.stringify({
        mcpServers: {
            'virtual-printer': {
                command: 'npx',
                args: ['-y', 'virtual-printer-mcp']
            }
        }
    }, null, 2);

    // MCP Config for HTTP (Vercel deployment)
    const httpConfig = JSON.stringify({
        mcpServers: {
            'virtual-printer': {
                url: `${detectedUrl}/api/mcp`,
                transport: 'http'
            }
        }
    }, null, 2);

    // Claude Desktop specific config
    const claudeConfig = JSON.stringify({
        mcpServers: {
            'virtual-printer': {
                command: 'npx',
                args: ['-y', 'virtual-printer-mcp']
            }
        }
    }, null, 2);

    // Cursor IDE config
    const cursorConfig = JSON.stringify({
        mcp: {
            servers: {
                'virtual-printer': {
                    command: 'npx',
                    args: ['-y', 'virtual-printer-mcp']
                }
            }
        }
    }, null, 2);

    const configs = [
        {
            id: 'claude',
            name: 'Claude Desktop',
            description: 'For Claude Desktop app (local stdio)',
            config: claudeConfig,
            path: '~/.claude/claude_desktop_config.json'
        },
        {
            id: 'cursor',
            name: 'Cursor IDE',
            description: 'For Cursor IDE settings',
            config: cursorConfig,
            path: '.cursor/mcp.json in your project'
        },
        {
            id: 'http',
            name: 'HTTP Transport',
            description: `For remote access via ${detectedUrl}`,
            config: httpConfig,
            path: 'Use with any MCP client supporting HTTP'
        },
        {
            id: 'generic',
            name: 'Generic (stdio)',
            description: 'Standard MCP stdio configuration',
            config: stdioConfig,
            path: 'mcp_config.json or equivalent'
        }
    ];

    return (
        <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
            {/* Header */}
            <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                <Text fontWeight="semibold" fontSize="sm">MCP Configuration Helper</Text>
                <Text fontSize="xs" color={mutedText}>Copy-paste configs for your LLM client</Text>
            </Box>

            <Box p={4}>
                <Tabs size="sm" variant="enclosed">
                    <TabList>
                        {configs.map(c => (
                            <Tab key={c.id}>{c.name}</Tab>
                        ))}
                    </TabList>
                    <TabPanels>
                        {configs.map(c => (
                            <TabPanel key={c.id} px={0}>
                                <VStack align="stretch" spacing={4}>
                                    <Box>
                                        <Text fontSize="sm" color={mutedText} mb={2}>
                                            {c.description}
                                        </Text>
                                        <HStack fontSize="xs" color={mutedText} mb={2}>
                                            <Icon as={FiExternalLink} />
                                            <Text>Save to: <Code fontSize="xs">{c.path}</Code></Text>
                                        </HStack>
                                    </Box>

                                    <Box position="relative">
                                        <Code
                                            display="block"
                                            whiteSpace="pre"
                                            p={4}
                                            bg={codeBg}
                                            borderRadius="md"
                                            fontSize="xs"
                                            overflowX="auto"
                                        >
                                            {c.config}
                                        </Code>
                                        <Tooltip label={copied === c.id ? 'Copied!' : 'Copy to clipboard'}>
                                            <Button
                                                position="absolute"
                                                top={2}
                                                right={2}
                                                size="sm"
                                                variant="solid"
                                                colorScheme={copied === c.id ? 'green' : 'gray'}
                                                leftIcon={<Icon as={copied === c.id ? FiCheck : FiCopy} />}
                                                onClick={() => handleCopy(c.config, c.id)}
                                            >
                                                {copied === c.id ? 'Copied' : 'Copy'}
                                            </Button>
                                        </Tooltip>
                                    </Box>

                                    {c.id === 'http' && (
                                        <Box p={3} bg="blue.50" _dark={{ bg: 'blue.900' }} borderRadius="md">
                                            <Text fontSize="xs" color="blue.700" _dark={{ color: 'blue.200' }}>
                                                <strong>Note:</strong> HTTP transport requires your MCP client to support it.
                                                The server must be deployed to a public URL (e.g., Vercel).
                                            </Text>
                                        </Box>
                                    )}
                                </VStack>
                            </TabPanel>
                        ))}
                    </TabPanels>
                </Tabs>

                {/* Quick Test */}
                <Box mt={4} pt={4} borderTop="1px solid" borderColor={borderColor}>
                    <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={2}>
                        Quick Test Commands
                    </Text>
                    <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between" p={2} bg={codeBg} borderRadius="md">
                            <Code fontSize="xs" bg="transparent">get_status</Code>
                            <Button
                                size="xs"
                                variant="ghost"
                                leftIcon={<Icon as={FiCopy} />}
                                onClick={() => handleCopy('get_status', 'get_status')}
                            >
                                Copy
                            </Button>
                        </HStack>
                        <HStack justify="space-between" p={2} bg={codeBg} borderRadius="md">
                            <Code fontSize="xs" bg="transparent">get_status with responseStyle: "friendly"</Code>
                            <Button
                                size="xs"
                                variant="ghost"
                                leftIcon={<Icon as={FiCopy} />}
                                onClick={() => handleCopy('get_status with responseStyle: "friendly"', 'friendly')}
                            >
                                Copy
                            </Button>
                        </HStack>
                    </VStack>
                </Box>
            </Box>
        </Box>
    );
}

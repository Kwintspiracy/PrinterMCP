import { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Textarea,
    Select,
    Badge,
    useColorModeValue,
    useToast,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Icon,
    Flex,
    Input,
    Divider,
    Code,
    Alert,
    AlertIcon,
    Switch,
    FormControl,
    FormLabel,
} from '@chakra-ui/react';
import { FiSave, FiRotateCcw, FiClock, FiCheck, FiEye, FiZap, FiCode, FiActivity } from 'react-icons/fi';

interface TemplateContent {
    technical: string;
    friendly: string;
    minimal: string;
}

interface TemplateVersion {
    id: string;
    template_key: string;
    version: number;
    name: string | null;
    content: TemplateContent;
    is_active: boolean;
    created_at: string;
}

interface TemplateEditorProps {
    apiBase?: string;
}

// Default templates - these are shown even before Supabase is set up
const DEFAULT_TEMPLATES: Record<string, TemplateContent> = {
    'status_ready': {
        technical: 'PRINTER_STATUS: READY. All systems operational.',
        friendly: 'The printer is ready and waiting for your print jobs! 🖨️',
        minimal: 'Ready'
    },
    'status_printing': {
        technical: 'PRINTER_STATUS: PRINTING. Job "${jobName}" in progress (${progress}%).',
        friendly: 'Currently printing "${jobName}" - ${progress}% complete!',
        minimal: 'Printing: ${progress}%'
    },
    'status_error': {
        technical: 'PRINTER_STATUS: ERROR. ${errorType}: ${errorMessage}. Action required.',
        friendly: 'Uh oh! The printer has an issue: ${errorMessage}. Let me help you fix it.',
        minimal: 'Error: ${errorType}'
    },
    'status_paused': {
        technical: 'PRINTER_STATUS: PAUSED. Awaiting resume command.',
        friendly: 'The printer is paused. Ready to continue when you are!',
        minimal: 'Paused'
    },
    'low_ink_warning': {
        technical: 'INK_WARNING: ${color} cartridge at ${level}%. Replacement recommended.',
        friendly: 'Heads up! Your ${color} ink is running low (${level}%). You might want to grab a replacement soon.',
        minimal: '${color} ink: ${level}%'
    },
    'ink_depleted': {
        technical: 'INK_CRITICAL: ${color} cartridge depleted. Printing disabled for color jobs.',
        friendly: 'The ${color} ink is empty! You\'ll need to replace it before printing in color.',
        minimal: '${color} ink empty!'
    },
    'paper_low': {
        technical: 'PAPER_WARNING: ${count} sheets remaining in tray. Capacity: ${capacity}.',
        friendly: 'Running low on paper - only ${count} sheets left. Time to reload!',
        minimal: 'Paper: ${count}/${capacity}'
    },
    'paper_empty': {
        technical: 'PAPER_CRITICAL: Paper tray empty. Load paper to continue.',
        friendly: 'The paper tray is empty! Please load some paper to continue printing.',
        minimal: 'No paper!'
    },
    'paper_jam': {
        technical: 'ERROR: Paper jam detected. Clear obstruction and resume.',
        friendly: 'Paper jam! Open the printer and gently remove the stuck paper, then we can try again.',
        minimal: 'Paper jam'
    },
    'maintenance_needed': {
        technical: 'MAINTENANCE: Print head cleaning recommended after ${pageCount} pages.',
        friendly: 'The printer could use some TLC! Consider running a cleaning cycle for best print quality.',
        minimal: 'Needs maintenance'
    },
    'job_completed': {
        technical: 'JOB_COMPLETE: "${jobName}" printed successfully. ${pages} pages.',
        friendly: 'Done! "${jobName}" has finished printing (${pages} pages). Go grab it! 📄',
        minimal: 'Printed: ${pages} pages'
    },
    'job_failed': {
        technical: 'JOB_FAILED: "${jobName}" could not be printed. Reason: ${reason}.',
        friendly: 'Unfortunately "${jobName}" couldn\'t be printed because: ${reason}',
        minimal: 'Print failed'
    }
};

const SAMPLE_VARIABLES: Record<string, Record<string, any>> = {
    'low_ink_warning': { color: 'cyan', level: 12 },
    'ink_depleted': { color: 'magenta' },
    'paper_low': { count: 15, capacity: 100 },
    'paper_jam': {},
    'paper_empty': {},
    'status_ready': {},
    'status_paused': {},
    'status_printing': { jobName: 'Report.pdf', progress: 45 },
    'status_error': { errorType: 'hardware_error', errorMessage: 'Communication timeout' },
    'job_completed': { jobName: 'Invoice.pdf', pages: 3 },
    'job_failed': { jobName: 'Document.pdf', reason: 'Out of paper' },
    'maintenance_needed': { pageCount: 500 },
};

// Convert defaults to version format for display
const getDefaultVersions = (): Record<string, TemplateVersion[]> => {
    return Object.entries(DEFAULT_TEMPLATES).reduce((acc, [key, content]) => {
        acc[key] = [{
            id: `default-${key}`,
            template_key: key,
            version: 0,
            name: 'Default (Built-in)',
            content,
            is_active: true,
            created_at: new Date().toISOString()
        }];
        return acc;
    }, {} as Record<string, TemplateVersion[]>);
};

export default function TemplateEditor({ apiBase = '' }: TemplateEditorProps) {
    // Initialize with defaults immediately
    const [templates, setTemplates] = useState<Record<string, TemplateVersion[]>>(getDefaultVersions());
    const [availableKeys] = useState<string[]>(Object.keys(DEFAULT_TEMPLATES));
    const [selectedKey, setSelectedKey] = useState<string>('low_ink_warning');
    const [editContent, setEditContent] = useState<TemplateContent>(DEFAULT_TEMPLATES['low_ink_warning']);
    const [versionName, setVersionName] = useState('');
    const [previewStyle, setPreviewStyle] = useState<'technical' | 'friendly' | 'minimal'>('friendly');
    const [previewText, setPreviewText] = useState('');
    const [loading, setLoading] = useState(false);
    const [supabaseConnected, setSupabaseConnected] = useState(false);
    const [activeStyle, setActiveStyle] = useState<'technical' | 'friendly' | 'minimal' | 'custom'>(() => {
        // Initialize from localStorage
        const saved = localStorage.getItem('printer-response-style');
        return (saved as 'technical' | 'friendly' | 'minimal' | 'custom') || 'technical';
    });
    const [styleSaving, setStyleSaving] = useState(false);
    const [askBeforeSwitch, setAskBeforeSwitch] = useState(false);
    const [verbatim, setVerbatim] = useState(false);
    const [customFormat, setCustomFormat] = useState('{"message": "${message}"}');
    const toast = useToast();

    const borderColor = useColorModeValue('borderLight.default', 'border.default');
    const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
    const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
    const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
    const codeBg = useColorModeValue('gray.100', 'gray.700');

    // Try to fetch from API, but fall back to defaults
    useEffect(() => {
        fetchTemplates();
        fetchActiveStyle();
    }, []);

    // Fetch active style from server
    const fetchActiveStyle = async () => {
        try {
            const res = await fetch(`${apiBase}/api/settings?type=user`);
            const data = await res.json();
            if (data.success && data.settings) {
                if (data.settings.responseStyle) {
                    setActiveStyle(data.settings.responseStyle);
                    localStorage.setItem('printer-response-style', data.settings.responseStyle);
                }
                if (data.settings.customFormat) {
                    setCustomFormat(data.settings.customFormat);
                }
                if (data.settings.askBeforeSwitch !== undefined) {
                    setAskBeforeSwitch(data.settings.askBeforeSwitch);
                }
                if (data.settings.verbatim !== undefined) {
                    setVerbatim(data.settings.verbatim);
                }
            }
        } catch (error) {
            console.warn('Could not fetch active style from server, using localStorage');
        }
    };

    // Save active style to both localStorage and server
    const saveActiveStyle = async (style: 'technical' | 'friendly' | 'minimal' | 'custom') => {
        setActiveStyle(style);
        localStorage.setItem('printer-response-style', style);
        setStyleSaving(true);

        try {
            const res = await fetch(`${apiBase}/api/settings?type=user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responseStyle: style })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: `Active style: ${style}`, status: 'success', duration: 2000 });
            }
        } catch (error) {
            console.warn('Could not save style to server, saved locally only');
        }
        setStyleSaving(false);
    };

    // Save custom format
    const saveCustomFormat = async (format: string) => {
        // Validate JSON
        try {
            JSON.parse(format);
        } catch (e) {
            toast({ title: 'Invalid JSON', description: 'Please enter valid JSON format', status: 'error', duration: 3000 });
            return;
        }

        setCustomFormat(format);

        try {
            const res = await fetch(`${apiBase}/api/settings?type=user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customFormat: format })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Custom format saved', status: 'success', duration: 2000 });
            }
        } catch (error) {
            console.warn('Could not save custom format to server');
            toast({ title: 'Could not save to server', status: 'warning', duration: 2000 });
        }
    };

    // Save askBeforeSwitch preference
    const saveAskBeforeSwitch = async (enabled: boolean) => {
        setAskBeforeSwitch(enabled);

        try {
            const res = await fetch(`${apiBase}/api/settings?type=user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ askBeforeSwitch: enabled })
            });
            const data = await res.json();
            if (data.success) {
                toast({
                    title: enabled ? 'LLM will ask before switching printers' : 'LLM will auto-switch printers',
                    status: 'success',
                    duration: 2000
                });
            }
        } catch (error) {
            console.warn('Could not save setting to server');
        }
    };

    // Save verbatim preference
    const saveVerbatim = async (enabled: boolean) => {
        setVerbatim(enabled);

        try {
            const res = await fetch(`${apiBase}/api/settings?type=user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verbatim: enabled })
            });
            const data = await res.json();
            if (data.success) {
                toast({
                    title: enabled ? 'Verbatim mode enabled' : 'Verbatim mode disabled',
                    description: enabled ? 'LLM will relay messages exactly as written' : 'LLM may rephrase messages',
                    status: 'success',
                    duration: 2000
                });
            }
        } catch (error) {
            console.warn('Could not save setting to server');
        }
    };

    // Update preview when content or style changes
    useEffect(() => {
        if (selectedKey && editContent[previewStyle]) {
            const variables = SAMPLE_VARIABLES[selectedKey] || {};
            let preview = editContent[previewStyle];
            Object.entries(variables).forEach(([key, value]) => {
                preview = preview.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
            });
            setPreviewText(preview);
        }
    }, [selectedKey, editContent, previewStyle]);

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${apiBase}/api/templates`);
            const data = await res.json();
            if (data.success && Object.keys(data.templates).length > 0) {
                // Merge with defaults - API templates take precedence
                const merged = { ...getDefaultVersions() };
                Object.entries(data.templates).forEach(([key, versions]) => {
                    merged[key] = versions as TemplateVersion[];
                });
                setTemplates(merged);
                setSupabaseConnected(true);
            }
        } catch (error) {
            console.warn('API not available, using default templates');
            // Keep using defaults - already set
        }
    };

    const loadTemplate = (key: string, templateData?: Record<string, TemplateVersion[]>) => {
        const data = templateData || templates;
        const versions = data[key];
        if (versions && versions.length > 0) {
            const active = versions.find(v => v.is_active) || versions[0];
            setEditContent(active.content);
        } else if (DEFAULT_TEMPLATES[key]) {
            // Fall back to default
            setEditContent(DEFAULT_TEMPLATES[key]);
        }
    };

    const handleKeyChange = (key: string) => {
        setSelectedKey(key);
        loadTemplate(key);
        setVersionName('');
    };

    const handleSave = async () => {
        if (!selectedKey) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/api/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: selectedKey,
                    content: editContent,
                    name: versionName || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: data.message, status: 'success', duration: 3000 });
                fetchTemplates();
                setVersionName('');
            } else {
                toast({ title: data.error, status: 'error', duration: 3000 });
            }
        } catch (error) {
            toast({ title: 'Failed to save template', status: 'error', duration: 3000 });
        }
        setLoading(false);
    };

    const handleRevert = async (version: number) => {
        if (!selectedKey) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/api/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'revert',
                    key: selectedKey,
                    version
                })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: data.message, status: 'success', duration: 3000 });
                fetchTemplates();
                loadTemplate(selectedKey);
            } else {
                toast({ title: data.error, status: 'error', duration: 3000 });
            }
        } catch (error) {
            toast({ title: 'Failed to revert template', status: 'error', duration: 3000 });
        }
        setLoading(false);
    };

    const selectedVersions = templates[selectedKey] || [];

    return (
        <VStack spacing={6} align="stretch">
            {/* SECTION 1: Response Configuration */}
            <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
                <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                    <HStack>
                        <Icon as={FiZap} color="blue.500" boxSize={4} />
                        <Text fontWeight="bold" fontSize="md">Response Configuration</Text>
                    </HStack>
                    <Text fontSize="xs" color={mutedText} mt={1}>
                        Configure how the LLM receives status messages
                    </Text>
                </Box>
                <Box p={4}>
                    <VStack spacing={4} align="stretch">
                        {/* Active Style Dropdown */}
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="semibold" mb={1}>
                                Active Response Style
                            </FormLabel>
                            <Select
                                size="sm"
                                value={activeStyle}
                                onChange={(e) => saveActiveStyle(e.target.value as any)}
                                isDisabled={styleSaving}
                            >
                                <option value="technical">⚙️ Technical</option>
                                <option value="friendly">😊 Friendly</option>
                                <option value="minimal">📝 Minimal</option>
                                <option value="custom">🔧 Custom Format</option>
                            </Select>
                        </FormControl>

                        {/* Verbatim Toggle */}
                        <HStack justify="space-between" align="center" p={3} bg={codeBg} borderRadius="md">
                            <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium">Verbatim Response</Text>
                                <Text fontSize="xs" color={mutedText}>LLM should relay message exactly as written</Text>
                            </VStack>
                            <Switch
                                isChecked={verbatim}
                                onChange={(e) => saveVerbatim(e.target.checked)}
                                colorScheme="blue"
                            />
                        </HStack>

                        {/* Ask Before Switch Toggle */}
                        <HStack justify="space-between" align="center" p={3} bg={codeBg} borderRadius="md">
                            <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium">Ask Before Switching Printers</Text>
                                <Text fontSize="xs" color={mutedText}>When default printer is unavailable</Text>
                            </VStack>
                            <Switch
                                isChecked={askBeforeSwitch}
                                onChange={(e) => saveAskBeforeSwitch(e.target.checked)}
                                colorScheme="green"
                            />
                        </HStack>
                    </VStack>
                </Box>
            </Box>

            {/* SECTION 2: Template/Format Editor */}
            <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
                <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                    <HStack>
                        <Icon as={FiCode} color="purple.500" boxSize={4} />
                        <Text fontWeight="bold" fontSize="md">
                            {activeStyle === 'custom' ? 'Custom Format Editor' : 'Template Editor'}
                        </Text>
                    </HStack>
                    <Text fontSize="xs" color={mutedText} mt={1}>
                        {activeStyle === 'custom'
                            ? 'Define your own JSON response structure'
                            : `Edit templates for ${activeStyle} style`}
                    </Text>
                </Box>

                <Box p={4}>
                    <VStack spacing={4} align="stretch">
                        {activeStyle === 'custom' ? (
                            <>
                                {/* Custom Format JSON Editor */}
                                <Box>
                                    <HStack mb={2} justify="space-between">
                                        <Text fontSize="sm" fontWeight="semibold">
                                            Custom JSON Format
                                        </Text>
                                        <Select size="xs" w="auto" onChange={(e) => setCustomFormat(e.target.value)}>
                                            <option value="">Load Preset...</option>
                                            <option value='{"message": "${message}"}'>Simple Message</option>
                                            <option value='{"status": "${status}", "message": "${message}"}'>Status + Message</option>
                                            <option value='{"printer": "${name}", "status": "${status}", "message": "${message}", "canPrint": ${canPrint}}'>Full Details</option>
                                        </Select>
                                    </HStack>
                                    <Textarea
                                        size="sm"
                                        rows={6}
                                        value={customFormat}
                                        onChange={(e) => setCustomFormat(e.target.value)}
                                        placeholder='{"message": "${message}"}'
                                        fontFamily="mono"
                                        fontSize="xs"
                                    />
                                    <HStack mt={2}>
                                        <Button size="xs" onClick={() => saveCustomFormat(customFormat)} colorScheme="blue">
                                            Save Custom Format
                                        </Button>
                                    </HStack>
                                </Box>

                                <Text fontSize="xs" color={mutedText}>
                                    Available variables: <Code fontSize="xs" bg={codeBg}>${'{'}message{'}'}</Code>, <Code fontSize="xs" bg={codeBg}>${'{'}status{'}'}</Code>, <Code fontSize="xs" bg={codeBg}>${'{'}name{'}'}</Code>, <Code fontSize="xs" bg={codeBg}>${'{'}inkLevels{'}'}</Code>, <Code fontSize="xs" bg={codeBg}>${'{'}paperCount{'}'}</Code>, <Code fontSize="xs" bg={codeBg}>${'{'}canPrint{'}'}</Code>
                                </Text>

                                {/* Custom Format Preview */}
                                <Box>
                                    <HStack mb={2}>
                                        <Icon as={FiEye} boxSize={3} color={mutedText} />
                                        <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase">
                                            Preview
                                        </Text>
                                    </HStack>
                                    <Box p={3} bg={codeBg} borderRadius="md" fontSize="sm">
                                        {(() => {
                                            try {
                                                const sampleMessage = "PRINTER_STATUS: READY. All systems operational. INK_WARNING: yellow at 9%.";
                                                let preview = customFormat;
                                                preview = preview.replace(/\$\{message\}/g, sampleMessage);
                                                preview = preview.replace(/\$\{status\}/g, 'ready');
                                                preview = preview.replace(/\$\{name\}/g, 'HP ENVY 6055e');
                                                preview = preview.replace(/\$\{inkLevels\}/g, '{"cyan":100,"magenta":100,"yellow":9,"black":100}');
                                                preview = preview.replace(/\$\{paperCount\}/g, '100');
                                                preview = preview.replace(/\$\{canPrint\}/g, 'true');
                                                const parsed = JSON.parse(preview);
                                                return <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(parsed, null, 2)}</pre>;
                                            } catch (e) {
                                                return <Text color="red.400">Invalid JSON format</Text>;
                                            }
                                        })()}
                                    </Box>
                                </Box>
                            </>
                        ) : (
                            <>
                                {/* Template Selector */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                        Select Template
                                    </Text>
                                    <Select
                                        size="sm"
                                        value={selectedKey}
                                        onChange={(e) => {
                                            setSelectedKey(e.target.value);
                                            loadTemplate(e.target.value);
                                        }}
                                    >
                                        <optgroup label="Status Templates">
                                            <option value="status_ready">Ready</option>
                                            <option value="status_printing">Printing</option>
                                            <option value="status_error">Error</option>
                                            <option value="status_paused">Paused</option>
                                        </optgroup>
                                        <optgroup label="Warnings & Alerts">
                                            <option value="low_ink_warning">Low Ink Warning</option>
                                            <option value="ink_depleted">Ink Depleted</option>
                                            <option value="paper_low">Paper Low</option>
                                            <option value="paper_empty">Paper Empty</option>
                                            <option value="paper_jam">Paper Jam</option>
                                            <option value="maintenance_needed">Maintenance Needed</option>
                                        </optgroup>
                                    </Select>
                                </Box>

                                {/* Template Editor */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                        Editing: {activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)} Template
                                    </Text>
                                    <Textarea
                                        size="sm"
                                        rows={4}
                                        value={activeStyle !== 'custom' ? (editContent[activeStyle] || '') : ''}
                                        onChange={(e) => setEditContent({ ...editContent, [activeStyle]: e.target.value })}
                                        placeholder={`${activeStyle} template...`}
                                        fontFamily="mono"
                                        fontSize="xs"
                                    />
                                    <Text fontSize="xs" color={mutedText} mt={2}>
                                        Use <Code fontSize="xs" bg={codeBg}>${'{'}variable{'}'}</Code> for dynamic values
                                    </Text>
                                </Box>

                                {/* Preview */}
                                <Box>
                                    <HStack mb={2}>
                                        <Icon as={FiEye} boxSize={3} color={mutedText} />
                                        <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase">
                                            Preview ({activeStyle})
                                        </Text>
                                    </HStack>
                                    <Box p={3} bg={codeBg} borderRadius="md" fontSize="sm">
                                        {activeStyle !== 'custom' && editContent[activeStyle] ? (
                                            (() => {
                                                const variables = SAMPLE_VARIABLES[selectedKey] || {};
                                                let preview = editContent[activeStyle] || '';
                                                Object.entries(variables).forEach(([key, value]) => {
                                                    preview = preview.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
                                                });
                                                return preview;
                                            })()
                                        ) : (
                                            <Text color={mutedText} fontStyle="italic">No preview available</Text>
                                        )}
                                    </Box>
                                </Box>

                                <Divider />

                                {/* Save Controls */}
                                <HStack justify="space-between">
                                    <Input
                                        size="sm"
                                        placeholder="Version name (optional)"
                                        value={versionName}
                                        onChange={(e) => setVersionName(e.target.value)}
                                        w="60%"
                                    />
                                    <Button
                                        size="sm"
                                        leftIcon={<Icon as={FiSave} />}
                                        colorScheme="blue"
                                        onClick={handleSave}
                                        isLoading={loading}
                                    >
                                        Save Template
                                    </Button>
                                </HStack>

                                {/* Version History */}
                                {selectedVersions.length > 0 && (
                                    <Box>
                                        <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                            Version History
                                        </Text>
                                        <VStack align="stretch" spacing={2}>
                                            {selectedVersions.map((ver) => (
                                                <Box
                                                    key={ver.id}
                                                    p={2}
                                                    borderRadius="md"
                                                    border="1px solid"
                                                    borderColor={ver.is_active ? 'green.500' : borderColor}
                                                    bg={ver.is_active ? 'green.50' : undefined}
                                                    _dark={{ bg: ver.is_active ? 'green.900' : undefined }}
                                                >
                                                    <HStack justify="space-between" align="center">
                                                        <HStack>
                                                            {ver.is_active && (
                                                                <Badge size="sm" colorScheme="green" variant="solid">
                                                                    <HStack spacing={1}>
                                                                        <Icon as={FiCheck} boxSize={3} />
                                                                        <Text>Active</Text>
                                                                    </HStack>
                                                                </Badge>
                                                            )}
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="xs" fontWeight="semibold">
                                                                    Version {ver.version}
                                                                </Text>
                                                                <Text fontSize="xs" color={mutedText}>
                                                                    {ver.name || 'Unnamed'}
                                                                </Text>
                                                                <HStack fontSize="xs" color={mutedText}>
                                                                    <Icon as={FiClock} boxSize={3} />
                                                                    <Text>{new Date(ver.created_at).toLocaleDateString()}</Text>
                                                                </HStack>
                                                            </VStack>
                                                        </HStack>
                                                        {!ver.is_active && (
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                leftIcon={<Icon as={FiRotateCcw} />}
                                                                onClick={() => handleRevert(ver.version)}
                                                                isLoading={loading}
                                                            >
                                                                Revert
                                                            </Button>
                                                        )}
                                                    </HStack>
                                                </Box>
                                            ))}
                                        </VStack>
                                    </Box>
                                )}
                            </>
                        )}
                    </VStack>
                </Box>
            </Box>

            {/* SECTION 3: LLM Test Guide */}
            <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
                <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                    <HStack>
                        <Icon as={FiActivity} color="green.500" boxSize={4} />
                        <Text fontWeight="bold" fontSize="md">Test with Your LLM</Text>
                    </HStack>
                    <Text fontSize="xs" color={mutedText} mt={1}>
                        Copy these commands to test in your LLM client
                    </Text>
                </Box>
                <Box p={4}>
                    <VStack align="stretch" spacing={3}>
                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={1}>
                                CURRENT CONFIGURATION
                            </Text>
                            <Code fontSize="xs" display="block" whiteSpace="pre" p={3} borderRadius="md" bg={codeBg}>
                                {`Tool: get_status\nParams: { "responseStyle": "${activeStyle}"${verbatim ? ', "verbatim": true' : ''} }`}
                            </Code>
                        </Box>

                        <Divider />

                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2}>
                                QUICK TEST COMMANDS
                            </Text>
                            <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between" p={2} bg={codeBg} borderRadius="md">
                                    <Code fontSize="xs" bg="transparent">get_status</Code>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => {
                                            navigator.clipboard.writeText('get_status');
                                            toast({ title: 'Copied!', status: 'success', duration: 2000 });
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </HStack>
                                <HStack justify="space-between" p={2} bg={codeBg} borderRadius="md">
                                    <Code fontSize="xs" bg="transparent">
                                        get_status with responseStyle: "{activeStyle}"
                                    </Code>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`get_status with responseStyle: "${activeStyle}"`);
                                            toast({ title: 'Copied!', status: 'success', duration: 2000 });
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </HStack>
                                {verbatim && (
                                    <HStack justify="space-between" p={2} bg={codeBg} borderRadius="md">
                                        <Code fontSize="xs" bg="transparent">
                                            get_status with verbatim: true
                                        </Code>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => {
                                                navigator.clipboard.writeText('get_status with verbatim: true');
                                                toast({ title: 'Copied!', status: 'success', duration: 2000 });
                                            }}
                                        >
                                            Copy
                                        </Button>
                                    </HStack>
                                )}
                            </VStack>
                        </Box>
                    </VStack>
                </Box>
            </Box>

            {/* Connection Status */}
            {supabaseConnected && (
                <Alert status="success" variant="subtle" size="sm">
                    <AlertIcon />
                    Connected to Supabase - templates will persist
                </Alert>
            )}
        </VStack>
    );
}

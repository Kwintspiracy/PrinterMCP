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
import { FiSave, FiRotateCcw, FiClock, FiCheck, FiEye, FiZap } from 'react-icons/fi';

interface TemplateContent {
    technical: string;
    friendly: string;
    minimal: string;
    exactCopy?: string;
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
    const [previewStyle, setPreviewStyle] = useState<'technical' | 'friendly' | 'minimal' | 'exactCopy'>('friendly');
    const [previewText, setPreviewText] = useState('');
    const [loading, setLoading] = useState(false);
    const [supabaseConnected, setSupabaseConnected] = useState(false);
    const [activeStyle, setActiveStyle] = useState<'technical' | 'friendly' | 'minimal' | 'exactCopy'>(() => {
        // Initialize from localStorage
        const saved = localStorage.getItem('printer-response-style');
        return (saved as 'technical' | 'friendly' | 'minimal' | 'exactCopy') || 'technical';
    });
    const [styleSaving, setStyleSaving] = useState(false);
    const [askBeforeSwitch, setAskBeforeSwitch] = useState(false);
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
                if (data.settings.askBeforeSwitch !== undefined) {
                    setAskBeforeSwitch(data.settings.askBeforeSwitch);
                }
            }
        } catch (error) {
            console.warn('Could not fetch active style from server, using localStorage');
        }
    };

    // Save active style to both localStorage and server
    const saveActiveStyle = async (style: 'technical' | 'friendly' | 'minimal') => {
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
        <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={cardBg} overflow="hidden">
            {/* Active Style Selector */}
            <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg="green.50" _dark={{ bg: 'green.900' }}>
                <HStack justify="space-between" align="center">
                    <HStack>
                        <Icon as={FiZap} color="green.500" />
                        <Text fontWeight="semibold" fontSize="sm">Active Response Style</Text>
                    </HStack>
                    <Select
                        size="sm"
                        w="180px"
                        value={activeStyle}
                        onChange={(e) => saveActiveStyle(e.target.value as any)}
                        isDisabled={styleSaving}
                        bg={cardBg}
                    >
                        <option value="technical">⚙️ Technical</option>
                        <option value="friendly">😊 Friendly</option>
                        <option value="minimal">📝 Minimal</option>
                        <option value="exactCopy">📋 Exact Copy</option>
                    </Select>
                </HStack>
                <HStack justify="space-between" align="center" mt={3} pt={3} borderTop="1px solid" borderColor={borderColor}>
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
            </Box>

            {/* LLM Trigger Guide */}
            <Box px={4} py={2} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={1}>HOW TO TRIGGER FROM LLM</Text>
                <Code fontSize="xs" display="block" whiteSpace="pre" p={2} borderRadius="md">
                    {`Tool: get_status
Params: { "responseStyle": "${activeStyle}" }`}
                </Code>
            </Box>

            {/* Header */}
            <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
                <Text fontWeight="semibold" fontSize="sm">Template Editor</Text>
                <Text fontSize="xs" color={mutedText}>Edit the text templates for each printer condition</Text>
            </Box>

            <Flex>
                {/* Template Selector & Editor */}
                <Box flex={2} p={4} borderRight="1px solid" borderColor={borderColor}>
                    <VStack spacing={4} align="stretch">
                        {/* Template Key Selector */}
                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={2}>
                                Select Template to Edit
                            </Text>
                            <Text fontSize="xs" color={mutedText} mb={2}>
                                Each template controls how the LLM describes a specific printer condition.
                            </Text>
                            <Select
                                size="sm"
                                value={selectedKey}
                                onChange={(e) => handleKeyChange(e.target.value)}
                            >
                                <optgroup label="Status Messages">
                                    <option value="status_ready">Status: Ready</option>
                                    <option value="status_printing">Status: Printing</option>
                                    <option value="status_paused">Status: Paused</option>
                                    <option value="status_error">Status: Error</option>
                                </optgroup>
                                <optgroup label="Ink Alerts">
                                    <option value="low_ink_warning">Low Ink Warning</option>
                                    <option value="ink_depleted">Ink Depleted</option>
                                </optgroup>
                                <optgroup label="Paper Alerts">
                                    <option value="paper_low">Paper Low</option>
                                    <option value="paper_empty">Paper Empty</option>
                                    <option value="paper_jam">Paper Jam</option>
                                </optgroup>
                                <optgroup label="Jobs & Maintenance">
                                    <option value="job_completed">Job Completed</option>
                                    <option value="job_failed">Job Failed</option>
                                    <option value="maintenance_needed">Maintenance Needed</option>
                                </optgroup>
                            </Select>
                        </Box>

                        {/* Template Editor Tabs */}
                        <Tabs size="sm" variant="enclosed">
                            <TabList>
                                <Tab>Technical</Tab>
                                <Tab>Friendly</Tab>
                                <Tab>Minimal</Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel p={0} pt={2}>
                                    <Textarea
                                        size="sm"
                                        rows={4}
                                        value={editContent.technical}
                                        onChange={(e) => setEditContent({ ...editContent, technical: e.target.value })}
                                        placeholder="Technical template..."
                                        fontFamily="mono"
                                        fontSize="xs"
                                    />
                                </TabPanel>
                                <TabPanel p={0} pt={2}>
                                    <Textarea
                                        size="sm"
                                        rows={4}
                                        value={editContent.friendly}
                                        onChange={(e) => setEditContent({ ...editContent, friendly: e.target.value })}
                                        placeholder="Friendly template..."
                                        fontFamily="mono"
                                        fontSize="xs"
                                    />
                                </TabPanel>
                                <TabPanel p={0} pt={2}>
                                    <Textarea
                                        size="sm"
                                        rows={4}
                                        value={editContent.minimal}
                                        onChange={(e) => setEditContent({ ...editContent, minimal: e.target.value })}
                                        placeholder="Minimal template..."
                                        fontFamily="mono"
                                        fontSize="xs"
                                    />
                                </TabPanel>
                            </TabPanels>
                        </Tabs>

                        <Text fontSize="xs" color={mutedText}>
                            Use <Code fontSize="xs" bg={codeBg}>${'{'}variable{'}'}</Code> for dynamic values
                        </Text>

                        {/* Preview */}
                        <Box>
                            <HStack mb={2}>
                                <Icon as={FiEye} boxSize={3} color={mutedText} />
                                <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase">
                                    Preview
                                </Text>
                                <Select
                                    size="xs"
                                    w="auto"
                                    value={previewStyle}
                                    onChange={(e) => setPreviewStyle(e.target.value as any)}
                                >
                                    <option value="technical">Technical</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="exactCopy">Exact Copy</option>
                                </Select>
                            </HStack>
                            <Box p={3} bg={codeBg} borderRadius="md" fontSize="sm">
                                {previewText || <Text color={mutedText} fontStyle="italic">No preview available</Text>}
                            </Box>
                        </Box>

                        <Divider />

                        {/* Save Controls */}
                        <HStack>
                            <Input
                                size="sm"
                                placeholder="Version name (optional)"
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                flex={1}
                            />
                            <Button
                                size="sm"
                                colorScheme="green"
                                leftIcon={<Icon as={FiSave} />}
                                onClick={handleSave}
                                isLoading={loading}
                            >
                                Save
                            </Button>
                        </HStack>
                    </VStack>
                </Box>

                {/* Version History */}
                <Box flex={1} p={4} maxH="500px" overflowY="auto">
                    <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase" mb={3}>
                        Version History
                    </Text>
                    <VStack spacing={2} align="stretch">
                        {selectedVersions.length === 0 ? (
                            <Text fontSize="sm" color={mutedText}>No versions yet</Text>
                        ) : (
                            selectedVersions.map((ver) => (
                                <Box
                                    key={ver.id}
                                    p={2}
                                    border="1px solid"
                                    borderColor={ver.is_active ? 'green.500' : borderColor}
                                    borderRadius="md"
                                    bg={ver.is_active ? 'green.50' : 'transparent'}
                                    _dark={{ bg: ver.is_active ? 'green.900' : 'transparent' }}
                                >
                                    <HStack justify="space-between">
                                        <VStack align="start" spacing={0}>
                                            <HStack>
                                                <Text fontSize="sm" fontWeight="medium">
                                                    v{ver.version}
                                                </Text>
                                                {ver.is_active && (
                                                    <Badge colorScheme="green" size="sm">
                                                        <Icon as={FiCheck} boxSize={3} mr={1} />
                                                        Active
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <Text fontSize="xs" color={mutedText}>
                                                {ver.name || 'Unnamed'}
                                            </Text>
                                            <HStack fontSize="xs" color={mutedText}>
                                                <Icon as={FiClock} boxSize={3} />
                                                <Text>{new Date(ver.created_at).toLocaleDateString()}</Text>
                                            </HStack>
                                        </VStack>
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
                            ))
                        )}
                    </VStack>
                </Box>
            </Flex>
        </Box>
    );
}

import {
	Avatar,
	Box,
	Card,
	CardContent,
	Chip,
	IconButton,
	Stack,
	Typography,
} from "@mui/material";
import { MessageCircle, Phone } from "lucide-react";

interface SupplierCardProps {
	name: string;
	role: string;
	phone?: string;
	paidAmount: number;
	totalAmount?: number; // Optional contract total
	currency?: string;
	onCall?: () => void;
	onWhatsApp?: () => void;
	onSelect?: () => void;
}

export function SupplierCard({
	name,
	role,
	phone,
	paidAmount,
	totalAmount,
	currency = "₪",
	onCall,
	onWhatsApp,
	onSelect,
}: SupplierCardProps) {
	return (
		<Card
			elevation={0}
			sx={{
				border: "1px solid",
				borderColor: "divider",
				cursor: onSelect ? "pointer" : "default",
				transition: "all 0.2s",
				"&:hover": {
					borderColor: "primary.main",
					boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
				},
			}}
			onClick={onSelect}
		>
			<CardContent sx={{ p: 2 }}>
				<Stack direction="row" spacing={2} alignItems="center">
					{/* Avatar */}
					<Avatar
						sx={{
							bgcolor: "primary.light",
							color: "primary.contrastText",
							width: 48,
							height: 48,
							fontWeight: 600,
						}}
					>
						{name.charAt(0)}
					</Avatar>

					{/* Info */}
					<Box sx={{ flex: 1 }}>
						<Typography variant="subtitle1" fontWeight={600}>
							{name}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{role}
						</Typography>
					</Box>

					{/* Actions */}
					<Stack direction="row" spacing={1}>
						{onWhatsApp && (
							<IconButton
								size="small"
								color="success"
								onClick={(e) => {
									e.stopPropagation();
									onWhatsApp();
								}}
								sx={{ bgcolor: "success.light", color: "success.contrastText" }}
							>
								<MessageCircle size={18} />
							</IconButton>
						)}
						{onCall && (
							<IconButton
								size="small"
								color="primary"
								onClick={(e) => {
									e.stopPropagation();
									onCall();
								}}
								sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
							>
								<Phone size={18} />
							</IconButton>
						)}
					</Stack>
				</Stack>
                {/* Footer Payment Info */}
                <Stack direction="row" justifyContent="space-between" mt={2} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                        {paidAmount > 0 ? "שולם עד כה:" : "לא שולם"}
                    </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        {currency}{paidAmount.toLocaleString()}
                        {totalAmount && <Typography component="span" variant="caption" color="text.secondary"> / {currency}{totalAmount.toLocaleString()}</Typography>}
                    </Typography>
                </Stack>
			</CardContent>
		</Card>
	);
}

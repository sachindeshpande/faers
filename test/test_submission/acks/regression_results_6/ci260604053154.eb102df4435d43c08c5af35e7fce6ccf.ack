<?xml version="1.0" encoding="UTF-8"?><MCCI_IN200101UV01 xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ITSVersion="XML_1.0" xsi:schemaLocation="urn:hl7-org:v3 MCCI_IN200101UV01.xsd">
	<id extension="3232719299" root="2.16.840.1.113883.3.989.2.1.3.20"/>
	<!-- ACK.M.1: Acknowledgement Batch Number -->
	<creationTime value="20260604013757-0400"/>
	<!-- ACK.M.4: Acknowledgement Date of Batch Transmission -->
	<responseModeCode code="D"/>
	<interactionId extension="MCCI_IN200101UV01" root="2.16.840.1.113883.1.6"/>
	<!-- Ack Message #1 -->
	<MCCI_IN000002UV01>
		<id extension="895680" root="2.16.840.1.113883.3.989.2.1.3.19"/>
		<!-- ACK.B.r.2 Local Report Number -->
		<interactionId extension="MCCI_IN000002UV01" root="2.16.840.1.113883.1.6"/>
		<processingCode code="P"/>
		<processingModeCode code="T"/>
		<acceptAckCode code="NE"/>
		<receiver typeCode="RCV">
			<device classCode="DEV" determinerCode="INSTANCE">
				<id extension="334818134" root="2.16.840.1.113883.3.989.2.1.3.16"/>
				<!-- ACK.B.r.3: ICSR Message ACK Receiver -->
			</device>
		</receiver>
		<sender typeCode="SND">
			<device classCode="DEV" determinerCode="INSTANCE">
				<id extension="CDER_IND" root="2.16.840.1.113883.3.989.2.1.3.15"/>
				<!-- ACK.B.r.4: ICSR Message ACK Sender -->
			</device>
		</sender>
		<attentionLine>
			<keyWordText code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="dateOfIcsrMessageCreation"/>
			<value value="20260315100000-0400" xsi:type="TS"/>
			<!-- ACK.B.r.5: Date of ICSR Message Creation -->
		</attentionLine>
		<acknowledgement typeCode="CR">
			<!-- ACK.B.r.6: Acknowledgement Code for a ICSR Message -->
			<targetMessage>
				<id extension="SR-CASE-20260603-INDT04" root="2.16.840.1.113883.3.989.2.1.3.1"/>
				<!-- ACK.B.r.1: ICSR Message Number -->
			</targetMessage>
			<acknowledgementDetail>
				<text>Safety report not loaded; Validated against 2.18 business rules;
Rejections:
1: For at least one event, there must be data in all tags 'G.k.9.i.2.r.1/G.k.9.i.2.r.2/G.k.9.i.2.r.3' for a product characterized with Drug Role 'G.k.1' as suspect (1) or interacting (3).
Warnings:
1: FDA.C.5.6.r is invalid for the Center specified in N.2.r.3.
</text>
				<!-- ACK.B.r.7: Error / Warning Message or Comment -->
			</acknowledgementDetail>
		</acknowledgement>
	</MCCI_IN000002UV01>
	<!-- Ack Message #1 -->
	<receiver typeCode="RCV">
		<device classCode="DEV" determinerCode="INSTANCE">
			<id extension="334818134" root="2.16.840.1.113883.3.989.2.1.3.18"/>
			<!-- ACK.M.3: Acknowledgement Batch Receiver Identifier -->
		</device>
	</receiver>
	<sender typeCode="SND">
		<device classCode="DEV" determinerCode="INSTANCE">
			<id extension="ZZFDATST_PREMKT" root="2.16.840.1.113883.3.989.2.1.3.17"/>
			<!-- ACK.M.2: Acknowledgement Batch Sender Identifier -->
		</device>
	</sender>
	<attentionLine>
		<keyWordText code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="acknowledgementLocalMessageNumber"/>
		<value extension="810950" root="2.16.840.1.113883.3.989.2.1.3.21" xsi:type="II"/>
		<!-- ACK.A.2: Acknowledgement Local Message Number -->
	</attentionLine>
	<attentionLine>
		<keyWordText code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="dateOfIcsrBatchTransmission"/>
		<value value="20260315100000-0400" xsi:type="TS"/>
		<!-- ACK.A.3: Date of ICSR Batch Transmission -->
	</attentionLine>
	<acknowledgement typeCode="AR">
		<!-- ACK.A.4: Transmission Acknowledgement Code -->
		<targetBatch>
			<id extension="DeepQuenceTest-20260604-24f8d585-d9c3-4f0e-bcb0-7b2666f244ef" root="2.16.840.1.113883.3.989.2.1.3.22"/>
			<!-- ACK.A.1: ICSR Batch Number -->
			<!-- the sender-identifier-value is the batch sender value in M.1.4 -->
		</targetBatch>
		<acknowledgementDetail>
			<text>Application Acknowledgment Reject (parsing error, no data extracted, re-send the entire transaction)</text>
			<!-- ACK.A.5: Batch Validation Error -->
		</acknowledgementDetail>
	</acknowledgement>
</MCCI_IN200101UV01>
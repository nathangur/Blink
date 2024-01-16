import PropTypes from "prop-types";
import React, { useState, useEffect, useLayoutEffect } from "react";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import { AnimatePresence, motion } from "framer-motion";

import { Link, useParams } from "react-router-dom";

import {
	BaseItemKind,
	ItemFields,
	LocationType,
} from "@jellyfin/sdk/lib/generated-client";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";

import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/card/card";
import Hero from "../../components/layouts/item/hero";

import { Blurhash } from "react-blurhash";

import LikeButton from "../../components/buttons/likeButton";
import { ErrorNotice } from "../../components/notices/errorNotice/errorNotice";
import { useApi } from "../../utils/store/api";
import { setBackdrop } from "../../utils/store/backdrop";

import meshBg from "../../assets/herobg.png";
import "./person.module.scss";

function TabPanel(props) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`full-width-tabpanel-${index}`}
			aria-labelledby={`full-width-tab-${index}`}
			{...other}
			style={{ marginTop: "1em" }}
		>
			{value === index && <div>{children}</div>}
		</div>
	);
}

TabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.number.isRequired,
	value: PropTypes.number.isRequired,
};

function a11yProps(index) {
	return {
		id: `full-width-tab-${index}`,
		"aria-controls": `full-width-tabpanel-${index}`,
	};
}

const PersonTitlePage = () => {
	const { id } = useParams();
	const [api] = useApi((state) => [state.api]);

	const user = useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			const usr = await getUserApi(api).getCurrentUser();
			return usr.data;
		},
		networkMode: "always",
		enabled: Boolean(api),
	});

	const item = useQuery({
		queryKey: ["item", id],
		queryFn: async () => {
			const result = await getUserLibraryApi(api).getItem({
				userId: user.data.Id,
				itemId: id,
				fields: [ItemFields.Crew],
			});
			return result.data;
		},
		enabled: !!user.data,
		networkMode: "always",
		refetchOnWindowFocus: true,
	});

	const personMovies = useQuery({
		queryKey: ["item", id, "personMovies"],
		queryFn: async () => {
			const result = await getItemsApi(api).getItems({
				userId: user.data.Id,
				personIds: [id],
				includeItemTypes: [BaseItemKind.Movie],
				recursive: true,
				sortBy: ["PremiereDate", "ProductionYear", "SortName"],
				sortOrder: ["Descending"],
				excludeLocationTypes: [LocationType.Virtual],
			});
			return result.data;
		},
		enabled: item.isSuccess && item.data.Type === BaseItemKind.Person,
		networkMode: "always",
	});
	const personShows = useQuery({
		queryKey: ["item", id, "personShows"],
		queryFn: async () => {
			const result = await getItemsApi(api).getItems({
				userId: user.data.Id,
				personIds: [id],
				includeItemTypes: [BaseItemKind.Series],
				recursive: true,
				sortBy: ["PremiereDate", "ProductionYear", "SortName"],
				sortOrder: ["Descending"],
				excludeLocationTypes: [LocationType.Virtual],
			});
			return result.data;
		},
		enabled: item.isSuccess && item.data.Type === BaseItemKind.Person,
		networkMode: "always",
	});

	const personBooks = useQuery({
		queryKey: ["item", id, "personBooks"],
		queryFn: async () => {
			const result = await getItemsApi(api).getItems({
				userId: user.data.Id,
				personIds: [id],
				includeItemTypes: [BaseItemKind.Book],
				recursive: true,
				sortBy: ["PremiereDate", "ProductionYear", "SortName"],
				sortOrder: ["Descending"],
				excludeLocationTypes: [LocationType.Virtual],
			});
			return result.data;
		},
		enabled: item.isSuccess && item.data.Type === BaseItemKind.Person,
		networkMode: "always",
	});
	const personPhotos = useQuery({
		queryKey: ["item", id, "personPhotos"],
		queryFn: async () => {
			const result = await getItemsApi(api).getItems({
				userId: user.data.Id,
				personIds: [id],
				includeItemTypes: [BaseItemKind.Photo],
				recursive: true,
				sortBy: ["PremiereDate", "ProductionYear", "SortName"],
				excludeLocationTypes: [LocationType.Virtual],
			});
			return result.data;
		},
		enabled: item.isSuccess && item.data.Type === BaseItemKind.Person,
		networkMode: "always",
	});
	const personEpisodes = useQuery({
		queryKey: ["item", id, "personEpisodes"],
		queryFn: async () => {
			const result = await getItemsApi(api).getItems({
				userId: user.data.Id,
				personIds: [id],
				includeItemTypes: [BaseItemKind.Episode],
				recursive: true,
				fields: ["SeasonUserData", "Overview"],
				sortBy: ["PremiereDate", "ProductionYear", "SortName"],
				excludeLocationTypes: [LocationType.Virtual],
				limit: 24,
			});
			return result.data;
		},
		enabled: item.isSuccess && item.data.Type === BaseItemKind.Person,
		networkMode: "always",
	});

	const [activePersonTab, setActivePersonTab] = useState(0);

	const personTabs = [
		{
			title: "Movies",
			data: personMovies,
			queryKey: ["item", id, "personMovies"],
		},
		{
			title: "TV Shows",
			data: personShows,
			queryKey: ["item", id, "personShows"],
		},
		{
			title: "Books",
			data: personBooks,
			queryKey: ["item", id, "personBooks"],
		},
		{
			title: "Photos",
			data: personPhotos,
			queryKey: ["item", id, "personPhotos"],
		},
		{
			title: "Episodes",
			data: personEpisodes,
			queryKey: ["item", id, "personEpisodes"],
		},
	];

	useLayoutEffect(() => {
		if (
			personMovies.isSuccess &&
			personShows.isSuccess &&
			personBooks.isSuccess &&
			personPhotos.isSuccess &&
			personEpisodes.isSuccess
		) {
			if (personMovies.data.TotalRecordCount !== 0) {
				setActivePersonTab(0);
			} else if (personShows.data.TotalRecordCount !== 0) {
				setActivePersonTab(1);
			} else if (personBooks.data.TotalRecordCount !== 0) {
				setActivePersonTab(2);
			} else if (personPhotos.data.TotalRecordCount !== 0) {
				setActivePersonTab(3);
			} else if (personEpisodes.data.TotalRecordCount !== 0) {
				setActivePersonTab(4);
			}
		}
		setBackdrop("", "");
	}, [
		personMovies.isSuccess,
		personShows.isSuccess,
		personBooks.isSuccess,
		personPhotos.isSuccess,
		personEpisodes.isSuccess,
	]);

	const [animationDirection, setAnimationDirection] = useState("forward");

	if (item.isPending) {
		return (
			<Box
				sx={{
					width: "100%",
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	if (item.isSuccess) {
		return (
			<motion.div
				key={id}
				initial={{
					opacity: 0,
				}}
				animate={{
					opacity: 1,
				}}
				transition={{
					duration: 0.25,
					ease: "easeInOut",
				}}
				className="scrollY padded-top"
			>
				<div className="item-hero flex flex-row">
					<div className="item-hero-backdrop-container">
						<img
							alt={item.data.Name}
							src={meshBg}
							className="item-hero-backdrop"
							onLoad={(e) => {
								e.currentTarget.style.opacity = 1;
							}}
						/>
					</div>
					<div
						className="item-hero-image-container"
						style={{
							aspectRatio: item.data.PrimaryImageAspectRatio ?? 1,
						}}
					>
						{Object.keys(item.data.ImageTags).includes("Primary") ? (
							<>
								<Blurhash
									hash={
										item.data.ImageBlurHashes.Primary[
											item.data.ImageTags.Primary
										]
									}
									className="item-hero-image-blurhash"
								/>
								<img
									alt={item.data.Name}
									src={api.getItemImageUrl(item.data.Id, "Primary", {
										quality: 90,
										tag: item.data.ImageTags.Primary,
									})}
									onLoad={(e) => {
										e.currentTarget.style.opacity = 1;
									}}
									className="item-hero-image"
								/>
							</>
						) : (
							<></>
						)}
					</div>
					<div className="item-hero-detail flex flex-column">
						{Object.keys(item.data.ImageTags).includes("Logo") ? (
							<img
								alt={item.data.Name}
								src={api.getItemImageUrl(item.data.Id, "Logo", {
									quality: 90,
									fillWidth: 592,
									fillHeight: 592,
								})}
								onLoad={(e) => {
									e.currentTarget.style.opacity = 1;
								}}
								className="item-hero-logo"
							/>
						) : (
							<Typography variant="h3">{item.data.Name}</Typography>
						)}

						<LikeButton
							itemName={item.data.Name}
							itemId={item.data.Id}
							queryKey={["item", id]}
							isFavorite={item.data.UserData.IsFavorite}
							userId={user.data.Id}
						/>
					</div>
				</div>
				<div className="item-detail">
					<div style={{ width: "100%" }}>
						<Typography variant="subtitle1">
							{item.data.Overview ?? ""}
						</Typography>
						<div
							style={{
								display: "flex",
								gap: "0.6em",
								alignSelf: "end",
								marginTop: "1em",
							}}
						>
							{item.data.ExternalUrls.map((url) => (
								<Link
									key={url.Url}
									target="_blank"
									to={url.Url}
									className="item-detail-link"
								>
									<Typography>{url.Name}</Typography>
								</Link>
							))}
						</div>
					</div>
					<Divider flexItem orientation="vertical" />
					<div
						style={{
							width: "100%",
						}}
					>
						{item.data.PremiereDate && (
							<>
								<Typography variant="h5">Born</Typography>
								<Typography sx={{ opacity: 0.8 }}>
									{new Date(item.data.PremiereDate).toDateString()}
								</Typography>
							</>
						)}
						{item.data.EndDate && (
							<>
								<Typography variant="h5" mt={2}>
									Death
								</Typography>
								<Typography sx={{ opacity: 0.8 }}>
									{new Date(item.data.EndDate).toDateString()}
								</Typography>
							</>
						)}
					</div>
				</div>

				<div className="item-detail-person-container">
					<div className="item-detail-person-header">
						<Tabs
							variant="scrollable"
							value={activePersonTab}
							onChange={(e, newVal) => {
								if (newVal > activePersonTab) {
									setAnimationDirection("forward");
								} else if (newVal < activePersonTab) {
									setAnimationDirection("backwards");
								}
								setActivePersonTab(newVal);
							}}
						>
							{personTabs.map((tab) => {
								return (
									<Tab
										key={tab.title}
										label={tab.title}
										disabled={tab.data.data?.TotalRecordCount === 0}
									/>
								);
							})}
						</Tabs>
						<Divider />
					</div>
					<AnimatePresence>
						{personTabs.map((tab, index) => {
							return (
								<TabPanel value={activePersonTab} index={index} key={tab.title}>
									<motion.div
										className={`item-detail-person-cards ${
											tab.title === "Movies" ||
											tab.title === "TV Shows" ||
											tab.title === "Books"
												? "col-8"
												: "col-4"
										}`}
										key={tab.queryKey}
										initial={{
											opacity: 0,
											transform:
												animationDirection === "forward"
													? "translate(30px)"
													: "translate(-30px)",
										}}
										animate={{
											opacity: 1,
											transform: "translate(0px)",
										}}
										transition={{
											duration: 0.2,
											ease: "anticipate",
										}}
									>
										{tab.data.isSuccess &&
											tab.data.data.Items.map((tabitem, index) => {
												return (
													<Card
														key={tabitem.Id}
														item={tabitem}
														cardTitle={
															tabitem.Type === BaseItemKind.Episode
																? tabitem.SeriesName
																: tabitem.Name
														}
														imageType={"Primary"}
														cardCaption={
															tabitem.Type === BaseItemKind.Episode
																? `S${tabitem.ParentIndexNumber}:E${tabitem.IndexNumber} - ${tabitem.Name}`
																: tabitem.Type === BaseItemKind.Series
																  ? `${tabitem.ProductionYear} - ${
																			tabitem.EndDate
																				? new Date(
																						tabitem.EndDate,
																				  ).toLocaleString([], {
																						year: "numeric",
																				  })
																				: "Present"
																	  }`
																  : tabitem.ProductionYear
														}
														cardType={
															tabitem.Type === BaseItemKind.Episode
																? "thumb"
																: "portrait"
														}
														queryKey={tab.queryKey}
														userId={user.data.Id}
														imageBlurhash={
															!!tabitem.ImageBlurHashes?.Primary &&
															tabitem.ImageBlurHashes?.Primary[
																Object.keys(tabitem.ImageBlurHashes.Primary)[0]
															]
														}
													/>
												);
											})}
									</motion.div>
									{tab.data.isSuccess &&
										tab.data.data.TotalRecordCount > 24 && (
											<Typography
												variant="h6"
												style={{
													opacity: 0.8,
												}}
											>
												And more...
											</Typography>
										)}
								</TabPanel>
							);
						})}
					</AnimatePresence>
				</div>
			</motion.div>
		);
	}
	if (item.isError) {
		return <ErrorNotice />;
	}
};

export default PersonTitlePage;
